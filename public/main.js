// ---- Compect Web 트랜스파일러 ----
function parseCompect(code){
    let html = "";
    const lines = code.split('\n');
    const stack = [];

    for(let i=0;i<lines.length;i++){
        let line = lines[i].trim();
        if(!line || line.startsWith("//")) continue;

        if(line.startsWith("Set(cat):")){
            html += `<div style="font-size:5em;text-align:center;">🐱</div>`;
            continue;
        }

        const mSet = line.match(/^Set\((\w+)\)\{/);
        if(mSet){ html += `<${mSet[1]}>`; stack.push(mSet[1]); continue; }

        if(line === "}"){ if(stack.length) html += `</${stack.pop()}>`; continue; }

        if(line.startsWith("let styles")){
            const cssLines = [];
            i++;
            while(i<lines.length && !lines[i].trim().startsWith("]")){
                cssLines.push(lines[i]);
                i++;
            }
            html += "<style>\n" + cssLines.join("\n") + "\n</style>";
            continue;
        }

        const mScript = line.match(/^<function\s([\s\S]*)>$/);
        if(mScript){ html += `<script>${mScript[1]}</script>`; continue; }

        const mTagAttr = line.match(/^\((\w+)\s*~>\[(.*)\]\)\{(.*)\}$/);
        if(mTagAttr){
            let [_, tag, attrStr, content] = mTagAttr;
            const attrs = attrStr.split(',').map(x=>{
                const [k,v] = x.split(':');
                return `${k.trim()}="${v.trim().replace(/"/g,'')}"`;
            }).join(' ');
            content = content.trim().replace(/^"|"$/g,'');
            html += `<${tag} ${attrs}>${content}</${tag}>`;
            continue;
        }

        const mTag = line.match(/^\((\w+)\)\{(.*)\}$/);
        if(mTag){
            let [_, tag, content] = mTag;
            content = content.trim().replace(/^"|"$/g,'');
            html += `<${tag}>${content}</${tag}>`;
            continue;
        }
    }

    return html;
}

// ---- Monaco Editor 초기화 ----
require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.41.0/min/vs' }});
require(['vs/editor/editor.main'], function() {
    monaco.languages.register({ id: 'compectweb' });

    monaco.languages.setMonarchTokensProvider('compectweb', {
        tokenizer: {
            root: [
                [/\b(Set|let|if|function)\b/, "keyword"],
                [/\(\w+\)/, "tag"],
                [/~>\[[^\]]*\]/, "attribute"],
                [/<function.*?>/, "function"],
                [/\*\{[^}]*\}/, "operator"],
                [/".*?"/, "string"],
                [/\{[^}]*\}/, "object"]
            ]
        }
    });

    monaco.editor.defineTheme('cw-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
            { token: 'tag', foreground: '8be9fd' },
            { token: 'attribute', foreground: '50fa7b' },
            { token: 'function', foreground: 'bd93f9' },
            { token: 'operator', foreground: 'f1fa8c' },
            { token: 'string', foreground: 'f1fa8c' },
            { token: 'object', foreground: 'ffb86c' }
        ]
    });

    window.editor = monaco.editor.create(document.getElementById('editor'), {
        value: 'Set(cat):',
        language: 'compectweb',
        theme: 'cw-dark',
        automaticLayout: true
    });

    editor.onDidChangeModelContent(() => {
        document.getElementById('preview').innerHTML = parseCompect(editor.getValue());
        attachInlineScripts();
    });
});

// ---- inline onclick 실행 ----
function attachInlineScripts(){
    const previewDiv = document.getElementById('preview');
    const buttons = previewDiv.querySelectorAll('[onclick]');
    buttons.forEach(btn => {
        const fnStr = btn.getAttribute('onclick');
        try { btn.onclick = new Function(fnStr); } 
        catch(e){ console.error(e); }
    });
}

// ---- Snippets ----
const snippetTemplates = {
    "set": `Set(body){ (div){ "Hello Compect Web!" } }`,
    "cat": `Set(cat):`
};

function insertSnippet(key){
    const sel = editor.getSelection();
    editor.executeEdits("", [{ range: sel, text: snippetTemplates[key] }]);
}

// ---- 파일 다운로드 ----
function downloadFile(type){
    let content = "";
    if(type==="cw") content = editor.getValue();
    else content = parseCompect(editor.getValue());
    const blob = new Blob([content], {type:'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `page.${type}`;
    a.click();
}

// ---- 파일 업로드 ----
document.getElementById('fileInput').addEventListener('change', e=>{
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(evt){
        editor.setValue(evt.target.result);
    }
    reader.readAsText(file);
});

// ---- 탭 전환 ----
function showTab(tab){
    document.getElementById('editor').style.display = tab==='editor'?'block':'none';
    document.getElementById('preview').style.display = tab==='preview'?'block':'none';
    document.getElementById('guide').style.display = tab==='guide'?'block':'none';
    document.querySelectorAll('#tabs button').forEach(btn=>btn.classList.remove('active'));
    document.querySelector(`#tabs button[onclick*="${tab}"]`).classList.add('active');
}
