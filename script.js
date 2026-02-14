document.addEventListener("DOMContentLoaded", () => {

/* ---------------- BOOT SCREEN ---------------- */

const bootLines = [
    "Initializing Hardware...",
    "Checking Memory... OK",
    "Detecting Keyboard Controller... OK",
    "Loading Input Handler...",
    "Starting CPU Services...",
    "Launching Visualization Engine...",
    "Welcome User"
];

const bootText = document.getElementById("bootText");

function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function runBoot(){
    if(!bootText) return;

    for(const line of bootLines){
        bootText.innerHTML += line + "\n";
        await wait(600);
    }
    await wait(700);
    switchScene(1);
}

/* ---------------- ELEMENTS ---------------- */

const startBtn   = document.getElementById("startBtn");
const input      = document.getElementById("userInput");
const text       = document.getElementById("stageText");
const explain    = document.getElementById("explainBox");
const bar        = document.getElementById("progressFill");
const restartBtn = document.getElementById("restartBtn");
const packet     = document.getElementById("packet");
const asciiVis   = document.getElementById("asciiVis");
const binaryVis  = document.getElementById("binaryVis");
const cpuInside  = document.getElementById("cpuInside");
const homeBtn = document.getElementById("homeBtn");


let speed = 4000;
let stepCount = 0;
let running = false;

/* ---------------- SCENE SWITCH ---------------- */

function switchScene(n){

    document.querySelectorAll(".scene").forEach(s => s.classList.remove("active"));
    document.getElementById("scene"+n)?.classList.add("active");

    // play title animation only on intro
    if(n===1){
        const title=document.getElementById("mainTitle");
        if(title){
            title.classList.remove("playTitle");
            void title.offsetWidth;
            setTimeout(()=>title.classList.add("playTitle"),60);
        }
    }

    const m=document.getElementById("mode")?.value;
    if(m==="slow") speed=5500;
    else if(m==="fast") speed=1200;
    else speed=4000;
}

/* ---------------- BUTTONS ---------------- */

startBtn?.addEventListener("click",()=>{
    switchScene(2);
    input?.focus();
});

restartBtn?.addEventListener("click",()=>{
    running=false;
    stepCount=0;

    bar.style.width="0%";
    text.textContent="Waiting for input...";
    explain.innerHTML="";

    packet.style.left="50%";
    packet.style.top="50%";

    input.value="";
    switchScene(2);
    input.focus();

if(asciiVis) asciiVis.textContent = "ASCII: -";
if(binaryVis) binaryVis.textContent = "Binary: --------";
if(cpuInside) cpuInside.textContent = "";

});

/* ---------------- INPUT ---------------- */

document.addEventListener("keydown",(e)=>{

    if(!document.getElementById("scene2")?.classList.contains("active")) return;
    if(running) return;

    if(e.key === "Backspace"){
        running=true;
        switchScene(3);
        backspaceProcess();
        e.preventDefault();
    }

    if(e.key === "Enter"){
        running=true;
        switchScene(3);
        enterProcess();
        e.preventDefault();
    }

});

input?.addEventListener("input", ()=>{

    if(!document.getElementById("scene2")?.classList.contains("active")) return;
    if(running) return;

    const char = input.value.trim();
    if(char.length === 0) return;

    running = true;
    switchScene(3);

    startJourney(char);

    // important → clear after reading
    setTimeout(()=> input.value="",10);

});

homeBtn?.addEventListener("click", () => {

    running = false;
    stepCount = 0;

    bar.style.width = "0%";
    text.textContent = "Waiting for input...";
    explain.innerHTML = "";

    packet.style.left = "50%";
    packet.style.top  = "50%";

    input.value = "";
    switchScene(1);   // 👈 back to intro page
});

/* ---------------- CURRENT FLOW ---------------- */
function createWire(fromId,toId){

    const from = document.getElementById(fromId);
    const to   = document.getElementById(toId);
    const box  = document.getElementById("animationBox");
    if(!from || !to || !box) return;

    const fromRect = from.getBoundingClientRect();
    const toRect   = to.getBoundingClientRect();
    const boxRect  = box.getBoundingClientRect();

    // center points
    let x1 = fromRect.left + fromRect.width/2 - boxRect.left;
    let y1 = fromRect.top  + fromRect.height/2 - boxRect.top;

    let x2 = toRect.left + toRect.width/2 - boxRect.left;
    let y2 = toRect.top  + toRect.height/2 - boxRect.top;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx*dx + dy*dy);

    if(distance < 5) return; // safety

    const nx = dx / distance;
    const ny = dy / distance;

    // move start outside source box
    const fromOffset = Math.max(fromRect.width,fromRect.height)/2;
    x1 += nx * fromOffset;
    y1 += ny * fromOffset;

    // move end outside destination box
    const toOffset = Math.max(toRect.width,toRect.height)/2;
    x2 -= nx * toOffset;
    y2 -= ny * toOffset;

    let length = Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));

    // prevent disappearing arrow
    if(length < 20) length = 20;

    const angle = Math.atan2(y2-y1,x2-x1) * 180/Math.PI;

    const wire = document.createElement("div");
    wire.className = "wire";
    wire.style.width = length + "px";
    wire.style.left = x1 + "px";
    wire.style.top = y1 + "px";
    wire.style.transform = `rotate(${angle}deg)`;

    box.appendChild(wire);
    setTimeout(()=>wire.remove(),900);
}

/* ---------------- MOVE PACKET ---------------- */

function moveTo(id){

    const el  = document.getElementById(id);
    const box = document.getElementById("animationBox");
    if(!el || !packet || !box) return;

    const boxRect = box.getBoundingClientRect();
    const elRect  = el.getBoundingClientRect();

    // exact center of target node
    const newX = elRect.left - boxRect.left + elRect.width/2;
    const newY = elRect.top  - boxRect.top  + elRect.height/2;

    // current packet center
    const oldX = packet.offsetLeft + packet.offsetWidth/2;
    const oldY = packet.offsetTop  + packet.offsetHeight/2;

    // draw accurate wire
    createWire(oldX, oldY, newX, newY);

    // move packet exactly to center
    packet.style.left = (newX - packet.offsetWidth/2) + "px";
    packet.style.top  = (newY - packet.offsetHeight/2) + "px";
}

/* typing animation */
async function typeText(element, message, baseSpeed=28){

    element.textContent="";

    for(let i=0;i<message.length;i++){

        const char = message[i];
        element.textContent += char;

        let delay = baseSpeed;

        // natural reading rhythm
        if(char===" ") delay += 35;
        if(char==="," ) delay += 120;
        if(char==="." ) delay += 220;
        if(char===":" ) delay += 180;
        if(char==="\n") delay += 250;

        await new Promise(r=>setTimeout(r,delay));
    }
}

/* delay helper */
function wait(ms){
    return new Promise(resolve=>setTimeout(resolve,ms));
}

/* ---------------- STEP TEXT ---------------- */
async function step(message, explanation=""){

    stepCount++;
    bar.style.width = (stepCount*16)+"%";

    text.style.opacity = 1;

    await typeText(text, message, 32);       // heading slower
    await typeText(explain, explanation, 20); // explanation readable

    await wait(speed);
}

/* final text */
function final(title, explanation){
    text.textContent = title;
    explain.innerHTML = explanation;
}

/* ---------------- ROUTER ---------------- */

function routeKey(key){
    if(key==="Backspace") return backspaceProcess();
    if(key==="Enter") return enterProcess();
    if(["Shift","Control","Alt","Meta"].includes(key)) return controlProcess(key);
    startJourney(key);
}

async function cpuCycle(){

    if(!cpuInside) return;

    const stages = ["FETCH","DECODE","EXECUTE","WRITE"];
    cpuInside.style.opacity = 1;

    for(const s of stages){
        cpuInside.textContent = s;
        await wait(650);
    }

    cpuInside.textContent = "";
    cpuInside.style.opacity = 0;
}

input?.addEventListener("keydown",(e)=>{

    if(!document.getElementById("scene2")?.classList.contains("active")) return;
    if(running) return;

    if(e.key==="Backspace"){
        running=true;
        switchScene(3);
        backspaceProcess();
    }

    if(e.key==="Enter"){
        running=true;
        switchScene(3);
        enterProcess();
    }

});

/* ---------------- NORMAL CHARACTER ---------------- */

async function startJourney(char){

    stepCount=0;
    bar.style.width="0%";

    moveTo("nodeKeyboard");
    await step(
        `Key Pressed : ${char}`,
        "The keyboard sends an electrical signal representing the pressed key to the motherboard through the keyboard controller."
    );

    moveTo("nodeRAM");
    await step(
        "Stored in RAM",
        "RAM temporarily stores the incoming data so the processor can access it instantly while processing."
    );

const ascii = char.charCodeAt(0);
if(asciiVis) asciiVis.textContent = "ASCII: " + ascii;

await step(
    `ASCII : ${ascii}`,
    "Each character is converted into a unique ASCII number so the computer can identify the symbol."
);

const binary = ascii.toString(2).padStart(8,"0");
if(binaryVis) binaryVis.textContent = "Binary: " + binary;

await step(
    `Binary : ${binary}`,
    "The ASCII number is translated into binary because digital circuits work using ON (1) and OFF (0) electrical states."
);

    moveTo("nodeCPU");
    await step(
        "CPU Processing",
        "The CPU fetches the instruction, decodes its meaning, and executes the required operation."
    );
await cpuCycle();

    moveTo("nodeScreen");
    await step(
        `Displayed : ${char}`,
        "The graphics hardware activates specific pixels to visually draw the character on the monitor."
    );

    running=false;
}

/* ---------------- BACKSPACE ---------------- */

async function backspaceProcess(){
    stepCount=0; bar.style.width="0%";

    moveTo("nodeKeyboard");
    await step("Backspace Pressed",
        "Instead of sending a character, the keyboard sends a delete instruction signal.");

    moveTo("nodeCPU");
    await step("Memory Updated",
        "The processor removes the previously stored character from memory.");

    moveTo("nodeScreen");
    await step("Display Refreshed",
        "The screen redraws without that character.");

    final(
        "Character Deleted",
        "The system erased the character and refreshed the output buffer."
    );

    running=false;
}

/* ---------------- ENTER ---------------- */

async function enterProcess(){
    stepCount=0; bar.style.width="0%";

    moveTo("nodeKeyboard");
    await step("Enter Key",
        "The keyboard sends a command instruction rather than a symbol.");

    moveTo("nodeCPU");
    await step("Processing Command",
        "The CPU interprets it as moving the cursor to the next line.");

    moveTo("nodeScreen");
    await step("Cursor Moved",
        "The display shifts typing position to a new line.");

    final(
        "New Line Created",
        "The system prepared a fresh line for upcoming characters."
    );

    running=false;
}

/* ---------------- CONTROL KEYS ---------------- */

async function controlProcess(key){
    stepCount=0; bar.style.width="0%";

    moveTo("nodeKeyboard");
    await step(key+" Key",
        "Modifier keys do not produce characters independently.");

    moveTo("nodeCPU");
    await step("Waiting for Combination",
        "They change the behavior of another key when pressed together.");

    final(
        "Modifier Active",
        "No output appears until another key is pressed along with it."
    );

    running=false;
}

/* ---------------- START ---------------- */

runBoot();

});
