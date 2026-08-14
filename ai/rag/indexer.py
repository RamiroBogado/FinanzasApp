import db
from knowledge_base import KNOWLEDGE_BASE_CHUNKS
from langchain_core.documents import Document

MONTH_NAMES = {
    "01": "enero", "02": "febrero", "03": "marzo", "04": "abril",
    "05": "mayo", "06": "junio", "07": "julio", "08": "agosto",
    "09": "septiembre", "10": "octubre", "11": "noviembre", "12": "diciembre",
}


def build_user_documents(user_id):
    docs = []
    for tx in db.get_transactions(user_id):
        label = "ingreso" if tx["type"] == "income" else "gasto"
        text = f"Transacción el {tx['date']}: {label} de ${tx['amount']:,.0f} en {tx['category']}"
        if tx.get("description"):
            text += f" ({tx['description']})"
        docs.append(Document(page_content=text, metadata={"user_id": user_id, "tipo": "transaccion", "fecha": tx["date"]}))

    docs += _monthly_summaries(user_id)

    for b in db.get_budgets(user_id):
        this_month = f"{b['year']}-{b['month']}"
        arrow = _month_label(this_month)
        docs.append(Document(
            page_content=f"Presupuesto de ${b['amount']:,.0f} para {b['category']} en {arrow}",
            metadata={"user_id": user_id, "tipo": "presupuesto"},
        ))

    for g in db.get_savings_goals(user_id):
        pct = 0
        if g["target_amount"]:
            pct = round(g["current_amount"] / g["target_amount"] * 100)
        text = f"Meta de ahorro '{g['name']}': ${g['current_amount']:,.0f} de ${g['target_amount']:,.0f} ({pct}%)"
        if g.get("deadline"):
            text += f". Fecha límite: {g['deadline']}"
        docs.append(Document(page_content=text, metadata={"user_id": user_id, "tipo": "meta"}))

    for a in db.get_alerts(user_id):
        docs.append(Document(
            page_content=f"Alerta ({a['type']}): {a['message']}",
            metadata={"user_id": user_id, "tipo": "alerta"},
        ))

    return docs


def _monthly_summaries(user_id):
    budgets = {}
    for b in db.get_budgets(user_id):
        budgets[(b["month"], b["year"], b["category"])] = b["amount"]

    groups = {}
    for tx in db.get_transactions(user_id):
        month = tx["date"][:7]
        key = (month, tx["category"], tx["type"])
        groups[key] = groups.get(key, 0) + tx["amount"]

    docs = []
    for (month, category, ttype), total in sorted(groups.items()):
        label = _month_label(month)
        verb = "gastaste" if ttype == "expense" else "recibiste"
        text = f"En {label} {verb} ${total:,.0f} en {category}"
        budget = budgets.get((month[5:7], int(month[:4]), category))
        if budget:
            pct = round(total / budget * 100)
            text += f" (presupuesto ${budget:,.0f}, {pct}% utilizado)"
        docs.append(Document(
            page_content=text,
            metadata={"user_id": user_id, "tipo": "resumen_mensual", "mes": month},
        ))
    return docs


def build_kb_documents():
    return [Document(page_content=chunk, metadata={"tipo": "conocimiento"}) for chunk in KNOWLEDGE_BASE_CHUNKS]


def _month_label(month):
    yyyy, mm = month.split("-")
    return f"{MONTH_NAMES.get(mm, mm)}/{yyyy}"