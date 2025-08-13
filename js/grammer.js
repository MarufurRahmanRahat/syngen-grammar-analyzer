let parsedGrammar = {};
let currentOp = "load";

const ids = sel => document.getElementById(sel);
const setOutput = html => ids("outputArea").innerHTML = html;

document.addEventListener("DOMContentLoaded", () => {
  ids("btnRun").addEventListener("click", runCurrent);
  ids("btnLoad").addEventListener("click", () => setOp("load"));
  ids("btnLeftRec").addEventListener("click", () => setOp("leftRec"));
  ids("btnLeftFactoring").addEventListener("click", () => setOp("leftFactoring"));
  ids("btnFirst").addEventListener("click", () => setOp("first"));
  ids("btnFollow").addEventListener("click", () => setOp("follow"));
  ids("btnLL1").addEventListener("click", () => setOp("ll1"));
});

function setOp(op){ currentOp = op; ids("title").innerText = titleFor(op); setOutput(""); }
function titleFor(op){
  return {
    load:"Grammar Input",
    leftRec:"Left Recursion Elimination",
    leftFactoring:"Left Factoring",
    first:"FIRST Set Calculation",
    follow:"FOLLOW Set Calculation",
    ll1:"LL(1) Parsing Table",
  }[op] || "Grammar Input";
}

function runCurrent(){
  const input = ids("grammarInput").value.trim();
  if(!input){ alert("Please enter grammar."); return; }
  parseGrammar(input);

  if(currentOp==="load"){ setOutput(`<div class="ok">Grammar loaded successfully.</div>`); return; }
  if(currentOp==="leftRec"){ const g = eliminateLeftRecursion(parsedGrammar); setOutput(displayGrammar("Grammar After Eliminating Left Recursion", g)); return; }
  if(currentOp==="leftFactoring"){ const g = leftFactoring(parsedGrammar); setOutput(displayGrammar("Grammar After Left Factoring", g)); return; }
  if(currentOp==="first"){ const first = computeFirstSets(parsedGrammar); setOutput(displayFirst(first)); return; }
  if(currentOp==="follow"){ const first = computeFirstSets(parsedGrammar); const follow = computeFollowSets(parsedGrammar, first, Object.keys(parsedGrammar)[0]); setOutput(displayFollow(follow)); return; }
  if(currentOp==="ll1"){
    const first = computeFirstSets(parsedGrammar);
    const follow = computeFollowSets(parsedGrammar, first, Object.keys(parsedGrammar)[0]);
    const table = generateLL1Table(parsedGrammar, first, follow);
    setOutput(displayLL1(table));
    return;
  }
}

/* ---------- Parsing & transforms ---------- */
function parseGrammar(input){
  parsedGrammar = {};
  const lines = input.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  for(const line of lines){
    const [lhs, rhs] = line.split("->").map(s=>s.trim());
    if(!lhs || !rhs){ continue; }
    const prods = rhs.split("|").map(s=>s.trim());
    if(!parsedGrammar[lhs]) parsedGrammar[lhs] = [];
    parsedGrammar[lhs].push(...prods);
  }
}

function eliminateLeftRecursion(grammar){
  const res = {};
  for(const A in grammar){
    const alphas=[], betas=[];
    for(const prod of grammar[A]){
      if(prod.startsWith(A+" ")) alphas.push(prod.slice(A.length).trim());
      else if(prod===A) alphas.push("ε"); // handle direct A->A
      else betas.push(prod);
    }
    if(alphas.length){
      const A1 = A+"'";
      res[A] = betas.length ? betas.map(b=> `${b} ${A1}`) : [A1]; // if no beta, A -> A' (degenerate)
      res[A1] = [...alphas.map(a=> `${a} ${A1}`), "ε"];
    }else{
      res[A] = [...grammar[A]];
    }
  }
  return res;
}

function leftFactoring(grammar){
  const out = {};
  for(const nt in grammar){
    const prods = [...grammar[nt]];
    const groups = groupByPrefix(prods);
    const newProds=[], created={};
    let idx=1;
    for(const prefix in groups){
      const arr = groups[prefix];
      if(arr.length===1){ newProds.push(arr[0]); continue; }
      const common = longestCommonPrefix(arr);
      const newNt = `${nt}_LF${idx++}`;
      newProds.push(`${common.join(" ")} ${newNt}`.trim());
      out[newNt] = arr.map(p=>{
        const rest = p.split(/\s+/).slice(common.length).join(" ").trim();
        return rest || "ε";
      });
      created[newNt]=true;
    }
    out[nt] = newProds.length? newProds: prods;
  }
  return out;

  function groupByPrefix(prods){
    const map={};
    for(const p of prods){
      const first = p.split(/\s+/)[0];
      (map[first] ||= []).push(p);
    }
    return map;
  }
  function longestCommonPrefix(list){
    const split = list.map(p=>p.split(/\s+/));
    const pref=[];
    for(let i=0;;i++){
      const t = split[0][i]; if(!t) break;
      if(split.every(a=>a[i]===t)) pref.push(t); else break;
    }
    return pref;
  }
}

function computeFirstSets(grammar){
  const first={};
  const isTerm = s => !grammar[s];
  const memo = sym =>{
    if(first[sym]) return first[sym];
    first[sym]= new Set();
    if(isTerm(sym)){ first[sym].add(sym); return first[sym]; }
    for(const prod of grammar[sym]){
      const symbols = prod.split(/\s+/);
      let allEps=true;
      for(const s of symbols){
        const f = memo(s);
        for(const x of f) if(x!=="ε") first[sym].add(x);
        if(!f.has("ε")){ allEps=false; break; }
      }
      if(allEps) first[sym].add("ε");
    }
    return first[sym];
  };
  for(const nt in grammar) memo(nt);
  return first;
}

function computeFollowSets(grammar, firstSets, start){
  const follow={}; for(const nt in grammar) follow[nt]= new Set();
  follow[start].add("$");
  let changed=true;
  while(changed){
    changed=false;
    for(const A in grammar){
      for(const prod of grammar[A]){
        const syms = prod.trim().split(/\s+/);
        for(let i=0;i<syms.length;i++){
          const B = syms[i];
          if(!grammar[B]) continue; // terminal
          let allEps=true;
          const add = new Set();
          for(let j=i+1;j<syms.length;j++){
            const f = firstSets[syms[j]] || new Set([syms[j]]);
            for(const x of f) if(x!=="ε") add.add(x);
            if(!f.has("ε")){ allEps=false; break; }
          }
          if(i===syms.length-1 || allEps){
            for(const x of follow[A]) add.add(x);
          }
          const size = follow[B].size;
          for(const x of add) follow[B].add(x);
          if(follow[B].size>size) changed=true;
        }
      }
    }
  }
  return follow;
}

function computeFirstOfProduction(symbols, firstSets){
  const res = new Set();
  for(const s of symbols){
    const f = firstSets[s] || new Set([s]);
    for(const x of f) if(x!=="ε") res.add(x);
    if(!f.has("ε")) return res;
  }
  res.add("ε");
  return res;
}

function generateLL1Table(grammar, first, follow){
  const table={};
  for(const A in grammar){
    table[A]={};
    for(const prod of grammar[A]){
      const syms = prod.trim().split(/\s+/);
      const f = computeFirstOfProduction(syms, first);
      for(const t of f) if(t!=="ε") table[A][t]= prod;
      if(f.has("ε")) for(const t of follow[A]) table[A][t]= prod;
    }
  }
  return table;
}

/* ---------- Display helpers ---------- */
function displayGrammar(title, g){
  let out = `<h3>${title}</h3><pre>`;
  for(const L in g){ out += `${L} -> ${g[L].join(" | ")}\n`; }
  out += "</pre>";
  return out;
}
function displayFirst(first){
  let out = `<h3>FIRST Sets</h3><pre>`;
  for(const nt in first){ out += `FIRST(${nt}) = { ${[...first[nt]].join(", ")} }\n`; }
  out += "</pre>"; return out;
}
function displayFollow(follow){
  let out = `<h3>FOLLOW Sets</h3><pre>`;
  for(const nt in follow){ out += `FOLLOW(${nt}) = { ${[...follow[nt]].join(", ")} }\n`; }
  out += "</pre>"; return out;
}
function displayLL1(table){
  const nts = Object.keys(table);
  const terms = new Set();
  nts.forEach(nt=> Object.keys(table[nt]).forEach(t=>terms.add(t)));
  const tlist = [...terms];
  let html = `<h3>LL(1) Parsing Table</h3>`;
  html += `<table><thead><tr><th>Non-Terminal</th>${tlist.map(t=>`<th>${t}</th>`).join("")}</tr></thead><tbody>`;
  for(const nt of nts){
    html += `<tr><th>${nt}</th>`;
    for(const t of tlist){
      html += `<td>${table[nt][t]||""}</td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  return html;
}
