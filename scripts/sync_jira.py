#!/usr/bin/env python3
"""Exporta os cards do Jira (projeto NEIF) para data/jira.js, lido pelo painel.

Uso local:
    JIRA_EMAIL=voce@exemplo.com JIRA_API_TOKEN=xxxx python3 scripts/sync_jira.py

No GitHub, a Action .github/workflows/sync.yml roda este script todo dia útil
usando os segredos JIRA_EMAIL e JIRA_API_TOKEN do repositório.
O token nunca vai para o site: só o arquivo gerado (data/jira.js) é publicado.
"""
import base64
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

SITE = os.environ.get("JIRA_SITE", "https://funpec2026.atlassian.net")
JQL = os.environ.get("JIRA_JQL", "project = NEIF AND labels = plano-nov2026 ORDER BY duedate ASC")
FIELDS = "summary,status,labels,duedate,description,updated,assignee,subtasks"
SAIDA = os.path.join(os.path.dirname(__file__), "..", "data", "jira.js")


def adf_para_texto(no, nivel=0):
    """Converte o formato ADF do Jira em markdown simples (negrito, listas, parágrafos)."""
    if no is None:
        return ""
    if isinstance(no, str):
        return no
    tipo = no.get("type")
    filhos = no.get("content", []) or []
    if tipo == "text":
        t = no.get("text", "")
        if any(m.get("type") == "strong" for m in no.get("marks", []) or []):
            t = f"**{t}**"
        return t
    if tipo == "hardBreak":
        return "\n"
    if tipo in ("bulletList", "orderedList"):
        return "".join(adf_para_texto(f, nivel + 1) for f in filhos) + "\n"
    if tipo == "listItem":
        dentro = "".join(adf_para_texto(f, nivel) for f in filhos).strip()
        return "  " * (nivel - 1) + "* " + dentro + "\n"
    if tipo == "paragraph":
        return "".join(adf_para_texto(f, nivel) for f in filhos) + ("\n\n" if nivel == 0 else "")
    if tipo == "heading":
        return "**" + "".join(adf_para_texto(f, nivel) for f in filhos) + "**\n\n"
    return "".join(adf_para_texto(f, nivel) for f in filhos)


def buscar():
    email = os.environ.get("JIRA_EMAIL")
    token = os.environ.get("JIRA_API_TOKEN")
    if not email or not token:
        sys.exit("Defina JIRA_EMAIL e JIRA_API_TOKEN.")
    auth = base64.b64encode(f"{email}:{token}".encode()).decode()
    issues, proximo = [], None
    while True:
        params = {"jql": JQL, "fields": FIELDS, "maxResults": 100}
        if proximo:
            params["nextPageToken"] = proximo
        url = f"{SITE}/rest/api/3/search/jql?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"Authorization": f"Basic {auth}", "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as r:
            dados = json.load(r)
        issues += dados.get("issues", [])
        proximo = dados.get("nextPageToken")
        if not proximo or dados.get("isLast", True):
            break
    return issues


def converter(issues):
    saida = []
    for i in issues:
        f = i["fields"]
        st = f.get("status") or {}
        subs = f.get("subtasks") or []
        saida.append({
            "key": i["key"],
            "summary": f.get("summary", ""),
            "status": st.get("name", ""),
            "cat": (st.get("statusCategory") or {}).get("key", "new"),
            "due": f.get("duedate"),
            "labels": f.get("labels") or [],
            "updated": (f.get("updated") or "")[:10],
            "assignee": (f.get("assignee") or {}).get("displayName"),
            "subtasks": len(subs),
            "subtasksDone": sum(1 for s in subs if ((s.get("fields") or {}).get("status") or {}).get("statusCategory", {}).get("key") == "done"),
            "description": adf_para_texto(f.get("description")).strip(),
        })
    return saida


def main():
    cards = converter(buscar())
    pacote = {
        "geradoEm": datetime.now(timezone.utc).isoformat(timespec="minutes"),
        "fonte": f"{SITE} · JQL: {JQL}",
        "base": f"{SITE}/browse/",
        "cards": cards,
    }
    with open(SAIDA, "w", encoding="utf-8") as fp:
        fp.write("/* Gerado por scripts/sync_jira.py. Não edite à mão. */\n")
        fp.write("window.JIRA_DATA = ")
        json.dump(pacote, fp, ensure_ascii=False, indent=1)
        fp.write(";\n")
    print(f"{len(cards)} cards exportados para {os.path.normpath(SAIDA)}")


if __name__ == "__main__":
    main()
