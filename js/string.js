const el = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  el("btnDetails").addEventListener("click", doDetails);
  el("btnComments").addEventListener("click", doComments);
  el("btnArticles").addEventListener("click", doArticles);
  el("btnCheckId").addEventListener("click", doCheckIdentifier);
  el("btnCheckKey").addEventListener("click", doCheckKeyword);
  el("btnPreps").addEventListener("click", doPrepositions);
  el("btnRegex").addEventListener("click", doRegexTest);
});

/* 1) Details */
function doDetails(){
  const s = el("stringInput").value;
  const length = s.length;
  const whitespaces = (s.match(/\s/g)||[]).length;
  const lines = s.split(/\r?\n/).length;
  el("stringOutput").innerHTML =
    `<h3>Details</h3>
     <table>
       <tr><th>Length</th><td>${length}</td></tr>
       <tr><th>Whitespace Count</th><td>${whitespaces}</td></tr>
       <tr><th>Number of Lines</th><td>${lines}</td></tr>
     </table>`;
}

/* 2) Extract comments (C/C++ style) */
function doComments(){
  const s = el("stringInput").value;
  const matches = s.match(/\/\/.*|\/\*[\s\S]*?\*\//g) || [];
  el("stringOutput").innerHTML = `<h3>Comments</h3><pre>${matches.join("\n")||"(none)"}</pre>`;
}

/* 3) Find articles */
function doArticles(){
  const s = el("stringInput").value;
  const rx = /\b(a|an|the)\b/gi;
  const matches = s.match(rx) || [];
  el("stringOutput").innerHTML = `<h3>Articles</h3>
    <p>Count: <strong>${matches.length}</strong></p>
    <pre>${matches.join(" ")||"(none)"} </pre>`;
}

/* 4a) Identifier valid? (C-like) */
function doCheckIdentifier(){
  const w = el("singleWord").value.trim();
  const isValid = /^[A-Za-z_][A-Za-z0-9_]*$/.test(w);
  el("stringOutput").innerHTML = `<h3>Identifier Check</h3><p>${w ? `"${w}" is ${isValid ? "<strong>valid</strong>" : "<strong>invalid</strong>"} identifier.` : "Enter a word in the input beside."}</p>`;
}

/* 4b) Keyword valid? (is it a C keyword?) */
function doCheckKeyword(){
  const keywords = new Set(["auto","break","case","char","const","continue","default","do","double","else","enum","extern","float","for","goto","if","inline","int","long","register","restrict","return","short","signed","sizeof","static","struct","switch","typedef","union","unsigned","void","volatile","while","_Bool","_Complex","_Imaginary"]);
  const w = el("singleWord").value.trim();
  const isKey = keywords.has(w);
  el("stringOutput").innerHTML = `<h3>Keyword Check</h3><p>${w ? `"${w}" is ${isKey ? "" : "not "}a <strong>C keyword</strong>.` : "Enter a word in the input beside."}</p>`;
}

/* 5) Preposition counting (basic list) */
function doPrepositions(){
  const list = ["about","above","across","after","against","along","among","around","at","before","behind","below","beneath","beside","between","beyond","but","by","despite","down","during","except","for","from","in","inside","into","like","near","of","off","on","onto","out","outside","over","past","since","through","throughout","till","to","toward","under","underneath","until","up","upon","with","within","without"];
  const s = el("stringInput").value.toLowerCase();
  let count=0;
  const hits=[];
  const words = s.match(/\b[a-z']+\b/g) || [];
  for(const w of words){
    if(list.includes(w)){ count++; hits.push(w); }
  }
  el("stringOutput").innerHTML = `<h3>Prepositions</h3>
    <p>Count: <strong>${count}</strong></p>
    <pre>${hits.join(" ")||"(none)"} </pre>`;
}

/* 6) Regex test */
function doRegexTest(){
  const pattern = el("regexInput").value;
  const text = el("regexText").value;
  if(!pattern){ el("stringOutput").innerHTML = `<div class="output">Enter a regex pattern.</div>`; return; }
  try{
    const rx = new RegExp(pattern, "g");
    const matches = text.match(rx) || [];
    el("stringOutput").innerHTML = `<h3>Regex Test</h3>
      <p>Pattern: <code>${pattern}</code></p>
      <p>Matches: <strong>${matches.length}</strong></p>
      <pre>${matches.join("\n")||"(none)"} </pre>`;
  }catch(e){
    el("stringOutput").innerHTML = `<h3>Regex Test</h3><div class="output">Invalid regex: ${e.message}</div>`;
  }
}
