//------------------------------------------------------------
//  FINAL WORKING GRAMMAR.JS
//------------------------------------------------------------
let parsedGrammar = {};
const $ = id => document.getElementById(id);
const show = html => $("outputArea").innerHTML = html;

document.addEventListener("DOMContentLoaded", () => {
  $("btnLoad").addEventListener("click", loadGrammar);

  $("btnLeftRec").addEventListener("click", () => {
    loadGrammar();
    show(displayGrammar("Grammar After Eliminating Left Recursion",
      eliminateLeftRecursion(parsedGrammar)));
  });

  $("btnLeftFactoring").addEventListener("click", () => {
    loadGrammar();
    show(displayGrammar("Grammar After Left Factoring",
      leftFactoring(parsedGrammar)));
  });

  $("btnFirst").addEventListener("click", () => {
    loadGrammar();
    show(displayFirst(computeFirstSets(parsedGrammar)));
  });

  $("btnFollow").addEventListener("click", () => {
    loadGrammar();
    const first = computeFirstSets(parsedGrammar);
    const follow = computeFollowSets(parsedGrammar, first,
      Object.keys(parsedGrammar)[0]);
    show(displayFollow(follow));
  });

  $("btnLL1").addEventListener("click", () => {
    loadGrammar();
    const first = computeFirstSets(parsedGrammar);
    const follow = computeFollowSets(parsedGrammar, first,
      Object.keys(parsedGrammar)[0]);
    show(displayLL1(generateLL1Table(parsedGrammar, first, follow)));
  });
});

function loadGrammar(){
  const input = $("grammarInput").value.trim();
  if(!input){ alert("Please enter grammar."); return; }
  parsedGrammar = {};
  input.split(/\r?\n/).map(line => line.trim()).filter(Boolean).forEach(line=>{
    const [lhs,rhs] = line.split("->").map(s=>s.trim());
    if(!lhs || !rhs) return;
    const prods = rhs.split("|").map(p=>p.trim());
    parsedGrammar[lhs] = parsedGrammar[lhs] || [];
    parsedGrammar[lhs].push(...prods);
  });
}


// Left Recursion
function eliminateLeftRecursion(g) {
  const out = {};
  for (const A in g) {
    const alphas = [], betas = [];
    g[A].forEach(prod => {
      if (prod.startsWith(A + " ")) alphas.push(prod.slice(A.length).trim());
      else if (prod === A) alphas.push("ε");
      else betas.push(prod);
    });
    if (alphas.length > 0) {
      const A1 = A + "'";
      out[A] = (betas.length ? betas.map(b => `${b} ${A1}`) : [A1]);
      out[A1] = [...alphas.map(a => `${a} ${A1}`), "ε"];
    } else {
      out[A] = g[A].slice();
    }
  }
  return out;
}

// Left Factoring
function leftFactoring(g) {
  const out = {};
  for (const nt in g) {
    const groups = {};
    g[nt].forEach(p => {
      const first = p.split(/\s+/)[0];
      (groups[first] = groups[first] || []).push(p);
    });
    const newProds = [];
    let idx = 1;
    for (const k in groups) {
      const list = groups[k];
      if (list.length === 1) {
        newProds.push(list[0]);
      } else {
        const lf = longestPrefix(list);
        const newNt = nt + "_LF" + (idx++);
        newProds.push(lf.join(" ") + " " + newNt);
        out[newNt] = list.map(p => {
          const right = p.split(/\s+/).slice(lf.length).join(" ");
          return right || "ε";
        });
      }
    }
    out[nt] = newProds;
  }
  return out;
}

function longestPrefix(list) {
  const split = list.map(p => p.split(/\s+/));
  let pref = [];
  for (let i = 0; ; i++) {
    const token = split[0][i];
    if (!token) break;
    if (split.every(r => r[i] === token)) pref.push(token);
    else break;
  }
  return pref;
}

// FIRST Sets
function computeFirstSets(g) {
  const first = {};
  const isTerm = s => !g[s];

  function getFirst(symbol) {
    if (first[symbol]) return first[symbol];
    first[symbol] = new Set();
    if (isTerm(symbol)) {
      first[symbol].add(symbol);
    } else {
      g[symbol].forEach(prod => {
        const tokens = prod.split(/\s+/);
        let allEps = true;
        for (const tok of tokens) {
          const f = getFirst(tok);
          f.forEach(v => { if (v !== "ε") first[symbol].add(v); });
          if (!f.has("ε")) { allEps = false; break; }
        }
        if (allEps) first[symbol].add("ε");
      });
    }
    return first[symbol];
  }
  Object.keys(g).forEach(getFirst);
  return first;
}

// FOLLOW Sets
function computeFollowSets(g, first, startSymbol) {
  const follow = {};
  Object.keys(g).forEach(nt => (follow[nt] = new Set()));
  follow[startSymbol].add("$");

  let updated = true;
  while (updated) {
    updated = false;
    for (const A in g) {
      g[A].forEach(prod => {
        const syms = prod.split(/\s+/);
        syms.forEach((B, i) => {
          if (!g[B]) return; // skip terminals
          let trailer = new Set();
          let allEps = true;
          for (let j = i + 1; j < syms.length; j++) {
            const f = first[syms[j]] || new Set([syms[j]]);
            f.forEach(x => { if (x !== "ε") trailer.add(x); });
            if (!f.has("ε")) { allEps = false; break; }
          }
          if (i === syms.length - 1 || allEps) {
            follow[A].forEach(x => trailer.add(x));
          }
          const size = follow[B].size;
          trailer.forEach(x => follow[B].add(x));
          if (follow[B].size > size) updated = true;
        });
      });
    }
  }
  return follow;
}

// LL(1) Table
function generateLL1Table(g, first, follow) {
  const table = {};
  for (const A in g) {
    table[A] = {};
    g[A].forEach(prod => {
      const syms = prod.split(/\s+/);
      const firstSet = computeFirstOfProd(syms, first);
      firstSet.forEach(t => {
        if (t !== "ε") table[A][t] = prod;
      });
      if (firstSet.has("ε")) {
        follow[A].forEach(t => table[A][t] = prod);
      }
    });
  }
  return table;
}

function computeFirstOfProd(list, firstSets) {
  const out = new Set();
  for (const s of list) {
    const f = firstSets[s] || new Set([s]);
    f.forEach(x => { if (x !== "ε") out.add(x); });
    if (!f.has("ε")) return out;
  }
  out.add("ε");
  return out;
}

// ------------------ Display helpers ---------------------

function displayGrammar(title, g) {
  let txt = `<h3>${title}</h3><pre>`;
  for (const L in g) txt += `${L} -> ${g[L].join(" | ")}\n`;
  return txt + "</pre>";
}

function displayFirst(first) {
  let out = "<h3>FIRST Sets</h3><pre>";
  Object.keys(first).forEach(k => {
    out += `FIRST(${k}) = { ${[...first[k]].join(", ")} }\n`;
  });
  return out + "</pre>";
}

function displayFollow(follow) {
  let out = "<h3>FOLLOW Sets</h3><pre>";
  Object.keys(follow).forEach(k => {
    out += `FOLLOW(${k}) = { ${[...follow[k]].join(", ")} }\n`;
  });
  return out + "</pre>";
}

function displayLL1(table) {
  const nts = Object.keys(table);
  const terms = new Set();
  nts.forEach(nt => Object.keys(table[nt]).forEach(t => terms.add(t)));

  let html = "<h3>LL(1) Parsing Table</h3><table><thead><tr><th>Non-Terminal</th>";
  [...terms].forEach(t => html += `<th>${t}</th>`);
  html += "</tr></thead><tbody>";

  nts.forEach(nt => {
    html += `<tr><th>${nt}</th>`;
    [...terms].forEach(t => {
      html += `<td>${table[nt][t] || ""}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  return html;
}
