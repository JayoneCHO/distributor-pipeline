import csv
import io
import os
from datetime import datetime, timedelta
from functools import wraps

from flask import (
    Flask,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    send_file,
    session,
    url_for,
)
from flask_sqlalchemy import SQLAlchemy
from openpyxl import Workbook
from werkzeug.security import check_password_hash, generate_password_hash


app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///mvp.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

PRODUCT_TAGS = ["PICO RU", "REBEAM", "MIWAVE", "FONS SVR", "LAMIS XL"]
STATUS_PIPELINE = [
    "New Lead",
    "Contacted",
    "Waiting Reply",
    "Negotiation",
    "Closed Won",
    "Closed Lost",
]


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)


class Lead(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company = db.Column(db.String(255), nullable=False)
    country = db.Column(db.String(120), nullable=False)
    contact_person = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    whatsapp = db.Column(db.String(120), nullable=True)
    source_event = db.Column(db.String(255), nullable=True)
    interested_products = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), nullable=False, default="New Lead")
    hot = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Communication(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    lead_id = db.Column(db.Integer, db.ForeignKey("lead.id"), nullable=False)
    channel = db.Column(db.String(50), nullable=False)  # Email / WhatsApp / Call / Meeting
    direction = db.Column(db.String(20), nullable=False)  # Outbound / Inbound
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    lead = db.relationship("Lead", backref=db.backref("communications", lazy=True, order_by="Communication.created_at.desc()"))


class MessageTemplate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    channel = db.Column(db.String(50), nullable=False)
    deal_stage = db.Column(db.String(50), nullable=False)
    product_tag = db.Column(db.String(50), nullable=False)
    body = db.Column(db.Text, nullable=False)


class PriceTemplate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    product_tag = db.Column(db.String(50), nullable=False)
    included_options = db.Column(db.Text, nullable=False)
    optional_handpieces = db.Column(db.Text, nullable=True)
    base_price_usd = db.Column(db.Float, nullable=False, default=0)


def login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return func(*args, **kwargs)

    return wrapper


def seed_admin():
    username = os.getenv("ADMIN_USERNAME", "admin")
    password = os.getenv("ADMIN_PASSWORD", "admin1234")
    user = User.query.filter_by(username=username).first()
    if not user:
        db.session.add(User(username=username, password_hash=generate_password_hash(password)))
        db.session.commit()


def build_followup_queue():
    queue = []
    now = datetime.utcnow()
    for lead in Lead.query.all():
        latest = Communication.query.filter_by(lead_id=lead.id).order_by(Communication.created_at.desc()).first()
        if not latest or latest.direction != "Outbound":
            continue
        days_waiting = (now - latest.created_at).days
        threshold = next((d for d in [3, 7, 14] if days_waiting >= d), None)
        if threshold is None:
            continue
        inbound_after = (
            Communication.query.filter(
                Communication.lead_id == lead.id,
                Communication.direction == "Inbound",
                Communication.created_at > latest.created_at,
            )
            .order_by(Communication.created_at.desc())
            .first()
        )
        if inbound_after is None:
            queue.append(
                {
                    "lead": lead,
                    "days_waiting": days_waiting,
                    "level": threshold,
                    "last_contact_at": latest.created_at,
                }
            )
    queue.sort(key=lambda x: x["days_waiting"], reverse=True)
    return queue


def generate_default_draft(lead, channel, stage, product):
    opening = f"Hi {lead.contact_person},\n\n"
    if stage == "New Lead":
        body = f"Thanks for your interest in {product}. I'd like to share product highlights and discuss your market needs in {lead.country}."
    elif stage == "Negotiation":
        body = f"Following up on the {product} proposal. We can align package options, handpieces, and pricing for your clinic network."
    elif stage == "Waiting Reply":
        body = f"Just checking in regarding your review of {product}. Let me know if you need updated specs, brochures, or training details."
    else:
        body = f"I wanted to update you on {product} and next steps for our cooperation."

    closing = "\n\nBest regards,\nExport Sales Manager"

    if channel == "WhatsApp":
        return f"Hi {lead.contact_person}, this is a quick follow-up about {product}. {body}"
    return opening + body + closing


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password_hash, password):
            session["user_id"] = user.id
            return redirect(url_for("dashboard"))
        flash("Invalid username or password", "danger")
    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/")
@login_required
def dashboard():
    leads = Lead.query.all()
    followups = build_followup_queue()
    overdue_count = len([x for x in followups if x["days_waiting"] >= 3])
    hot_leads = Lead.query.filter_by(hot=True).count()

    country_summary = {}
    for lead in leads:
        country_summary[lead.country] = country_summary.get(lead.country, 0) + 1

    return render_template(
        "dashboard.html",
        overdue_count=overdue_count,
        hot_leads=hot_leads,
        country_summary=country_summary,
        followups=followups,
    )


@app.route("/leads", methods=["GET", "POST"])
@login_required
def leads():
    if request.method == "POST":
        lead = Lead(
            company=request.form["company"],
            country=request.form["country"],
            contact_person=request.form["contact_person"],
            email=request.form["email"],
            whatsapp=request.form.get("whatsapp"),
            source_event=request.form.get("source_event"),
            interested_products=",".join(request.form.getlist("interested_products")),
            status=request.form.get("status", "New Lead"),
            hot=bool(request.form.get("hot")),
        )
        db.session.add(lead)
        db.session.commit()
        flash("Lead created.", "success")
        return redirect(url_for("leads"))

    items = Lead.query.order_by(Lead.updated_at.desc()).all()
    return render_template("leads.html", leads=items, product_tags=PRODUCT_TAGS, status_pipeline=STATUS_PIPELINE)


@app.route("/leads/<int:lead_id>", methods=["GET", "POST"])
@login_required
def lead_detail(lead_id):
    lead = Lead.query.get_or_404(lead_id)
    if request.method == "POST":
        comm = Communication(
            lead_id=lead.id,
            channel=request.form["channel"],
            direction=request.form["direction"],
            message=request.form["message"],
        )
        lead.status = request.form.get("status", lead.status)
        lead.hot = bool(request.form.get("hot"))
        db.session.add(comm)
        db.session.commit()
        flash("Communication logged.", "success")
        return redirect(url_for("lead_detail", lead_id=lead.id))

    return render_template("lead_detail.html", lead=lead, status_pipeline=STATUS_PIPELINE)


@app.route("/templates", methods=["GET", "POST"])
@login_required
def templates_page():
    if request.method == "POST":
        t = MessageTemplate(
            name=request.form["name"],
            channel=request.form["channel"],
            deal_stage=request.form["deal_stage"],
            product_tag=request.form["product_tag"],
            body=request.form["body"],
        )
        db.session.add(t)
        db.session.commit()
        flash("Message template saved.", "success")
        return redirect(url_for("templates_page"))

    templates = MessageTemplate.query.order_by(MessageTemplate.id.desc()).all()
    return render_template("templates.html", templates=templates, product_tags=PRODUCT_TAGS, status_pipeline=STATUS_PIPELINE)


@app.route("/price-templates", methods=["GET", "POST"])
@login_required
def price_templates():
    if request.method == "POST":
        p = PriceTemplate(
            name=request.form["name"],
            product_tag=request.form["product_tag"],
            included_options=request.form["included_options"],
            optional_handpieces=request.form.get("optional_handpieces"),
            base_price_usd=float(request.form["base_price_usd"]),
        )
        db.session.add(p)
        db.session.commit()
        flash("Price template saved.", "success")
        return redirect(url_for("price_templates"))

    items = PriceTemplate.query.order_by(PriceTemplate.id.desc()).all()
    return render_template("price_templates.html", items=items, product_tags=PRODUCT_TAGS)


@app.route("/draft-generator", methods=["GET", "POST"])
@login_required
def draft_generator():
    generated = None
    leads = Lead.query.order_by(Lead.company.asc()).all()
    if request.method == "POST":
        lead = Lead.query.get_or_404(int(request.form["lead_id"]))
        channel = request.form["channel"]
        stage = request.form["deal_stage"]
        product = request.form["product_tag"]

        selected_template = MessageTemplate.query.filter_by(
            channel=channel,
            deal_stage=stage,
            product_tag=product,
        ).first()

        if selected_template:
            generated = selected_template.body.replace("{{contact}}", lead.contact_person).replace("{{company}}", lead.company)
        else:
            generated = generate_default_draft(lead, channel, stage, product)

    return render_template(
        "draft_generator.html",
        leads=leads,
        generated=generated,
        product_tags=PRODUCT_TAGS,
        status_pipeline=STATUS_PIPELINE,
    )


@app.route("/export/leads.csv")
@login_required
def export_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Company", "Country", "Contact", "Email", "WhatsApp", "Source Event", "Products", "Status"])
    for lead in Lead.query.order_by(Lead.id.asc()).all():
        writer.writerow(
            [
                lead.company,
                lead.country,
                lead.contact_person,
                lead.email,
                lead.whatsapp or "",
                lead.source_event or "",
                lead.interested_products,
                lead.status,
            ]
        )

    memory = io.BytesIO()
    memory.write(output.getvalue().encode("utf-8"))
    memory.seek(0)
    return send_file(memory, mimetype="text/csv", as_attachment=True, download_name="leads_export.csv")


@app.route("/export/leads.xlsx")
@login_required
def export_xlsx():
    wb = Workbook()
    ws = wb.active
    ws.title = "Leads"
    ws.append(["Company", "Country", "Contact", "Email", "WhatsApp", "Source Event", "Products", "Status"])

    for lead in Lead.query.order_by(Lead.id.asc()).all():
        ws.append(
            [
                lead.company,
                lead.country,
                lead.contact_person,
                lead.email,
                lead.whatsapp or "",
                lead.source_event or "",
                lead.interested_products,
                lead.status,
            ]
        )

    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    return send_file(
        out,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name="leads_export.xlsx",
    )


# API namespace for future integration
@app.route("/api/v1/leads", methods=["GET"])
@login_required
def api_leads():
    data = [
        {
            "id": lead.id,
            "company": lead.company,
            "country": lead.country,
            "contact_person": lead.contact_person,
            "email": lead.email,
            "whatsapp": lead.whatsapp,
            "source_event": lead.source_event,
            "interested_products": lead.interested_products.split(",") if lead.interested_products else [],
            "status": lead.status,
            "hot": lead.hot,
            "updated_at": lead.updated_at.isoformat(),
        }
        for lead in Lead.query.all()
    ]
    return jsonify(data)


@app.route("/api/v1/integrations/gmail/sync", methods=["POST"])
@login_required
def gmail_sync_placeholder():
    return jsonify({"status": "placeholder", "message": "Gmail sync endpoint reserved for future implementation"}), 501


@app.route("/api/v1/integrations/calendar/sync", methods=["POST"])
@login_required
def calendar_sync_placeholder():
    return jsonify({"status": "placeholder", "message": "Calendar sync endpoint reserved for future implementation"}), 501


def init_db():
    with app.app_context():
        db.create_all()
        seed_admin()


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
