import os
import sqlite3

DB_PATH = os.environ.get("DB_PATH", "../backend/finanzas.db")


def connect():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def get_user(user_id):
    with connect() as conn:
        row = conn.execute(
            "SELECT id, name, email FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    return dict(row) if row else None


def get_aggregates(user_id):
    with connect() as conn:
        row = conn.execute(
            """
            SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
                   COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
            FROM transactions WHERE user_id = ?
            """,
            (user_id,),
        ).fetchone()
    return dict(row)


def get_transactions(user_id):
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT t.date, t.type, t.amount, t.description, c.name AS category
            FROM transactions t JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = ? ORDER BY t.date DESC
            """,
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_budgets(user_id):
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT b.month, b.year, b.amount, c.name AS category
            FROM budgets b JOIN categories c ON b.category_id = c.id
            WHERE b.user_id = ? ORDER BY b.year DESC, b.month DESC
            """,
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_savings_goals(user_id):
    with connect() as conn:
        rows = conn.execute(
            "SELECT name, target_amount, current_amount, deadline FROM savings_goals WHERE user_id = ?",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_alerts(user_id):
    with connect() as conn:
        rows = conn.execute(
            "SELECT message, type, created_at FROM alerts WHERE user_id = ? AND read = 0 ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]