// script.js
document.addEventListener("DOMContentLoaded", () => {

  let countdownInterval;

  function showScreen(screen){
    document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
    document.getElementById(screen).classList.add("active");
  }

  function generateCode(){
    return Math.random().toString(36).substring(2,8).toUpperCase();
  }

  async function createMessage(){
    const message = document.getElementById("message").value;
    const password = document.getElementById("password").value;
    const time = document.getElementById("time").value;
    const unit = document.getElementById("unit").value;
    const allowDownload = document.getElementById("allowDownload").checked;

    if(!message || !password || !time){ alert("Completa todos los campos"); return; }

    let ms = time;
    if(unit==="minutes") ms*=60*1000;
    if(unit==="hours") ms*=60*60*1000;
    if(unit==="days") ms*=24*60*60*1000;

    const unlock = Date.now() + ms;
    const code = generateCode();
    const data = { message:btoa(message), password:btoa(password), unlock, download:allowDownload };

    await db.collection("messages").doc(code).set(data);

    document.getElementById("generatedCode").innerHTML = `
      <div class="code-box">
        <span>${code}</span>
        <button class="copy-btn" onclick="copyCode('${code}')">Copiar</button>
      </div>
    `;
  }

  function copyCode(code){
    navigator.clipboard.writeText(code);
    alert("Código copiado");
  }

  function startCountdown(unlock){
    clearInterval(countdownInterval);
    const result = document.getElementById("result");
    countdownInterval = setInterval(()=>{
      const now = Date.now();
      const remaining = unlock - now;
      if(remaining <=0){ 
        clearInterval(countdownInterval); 
        result.innerHTML="El mensaje ya puede abrirse"; 
        return; 
      }

      const days = Math.floor(remaining/(1000*60*60*24));
      const hours = Math.floor((remaining/(1000*60*60))%24);
      const minutes = Math.floor((remaining/(1000*60))%60);
      const seconds = Math.floor((remaining/1000)%60);

      result.innerHTML = `
        Mensaje bloqueado
        <div class="countdown">${days}d ${hours}h ${minutes}m ${seconds}s</div>
      `;
    },1000);
  }

  async function checkMessage(){
    const code = document.getElementById("codeInput").value;
    const password = document.getElementById("passwordInput").value;
    const doc = await db.collection("messages").doc(code).get();
    const result = document.getElementById("result");

    if(!doc.exists){ result.innerText="Código no encontrado"; return; }
    const data = doc.data();

    if(Date.now() < data.unlock){ startCountdown(data.unlock); return; }
    if(btoa(password) !== data.password){ result.innerText="Contraseña incorrecta"; return; }

    const message = atob(data.message);
    let html = `<p>${message}</p>`;
    if(data.download){ html += `<button onclick="downloadText(\`${message}\`)">Descargar .txt</button>`; }
    result.innerHTML = html;
  }

  function downloadText(text){
    const blob = new Blob([text],{type:"text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mensaje.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function loadMessage(){
    const code = document.getElementById("manageCode").value;
    const password = document.getElementById("managePassword").value;
    const doc = await db.collection("messages").doc(code).get();
    const managePanel = document.getElementById("managePanel");

    if(!doc.exists){ managePanel.innerText="Código no encontrado"; return; }
    const data = doc.data();
    if(btoa(password)!==data.password){ managePanel.innerText="Contraseña incorrecta"; return; }

    const remaining = data.unlock - Date.now();
    const hours = Math.floor(remaining/1000/60/60);
    let html = `Tiempo restante: ${hours} horas<br><br>`;
    if(hours <=24){
      html += `
        <input type="number" id="extraTime" placeholder="Añadir tiempo">
        <select id="extraUnit">
          <option value="minutes">Minutos</option>
          <option value="hours">Horas</option>
          <option value="days">Días</option>
        </select>
        <button onclick="extend('${code}')">Aplazar tiempo</button>
      `;
    } else {
      html+="Solo puedes extender el tiempo cuando queden 24h o menos.";
    }
    managePanel.innerHTML = html;
  }

  async function extend(code){
    const docRef = db.collection("messages").doc(code);
    const doc = await docRef.get();
    let data = doc.data();
    let extra = document.getElementById("extraTime").value;
    const unit = document.getElementById("extraUnit").value;

    if(unit==="minutes") extra*=60*1000;
    if(unit==="hours") extra*=60*60*1000;
    if(unit==="days") extra*=24*60*60*1000;

    data.unlock += extra;
    await docRef.set(data);
    document.getElementById("managePanel").innerHTML = "Tiempo ampliado correctamente";
  }

  // Exportar funciones al scope global para que onclick las encuentre
  window.showScreen = showScreen;
  window.createMessage = createMessage;
  window.checkMessage = checkMessage;
  window.loadMessage = loadMessage;
  window.extend = extend;
  window.copyCode = copyCode;
  window.downloadText = downloadText;

});
