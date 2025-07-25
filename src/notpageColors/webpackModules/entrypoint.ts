let lastHue: number | null = null;

// CSS variables seem to be getting overriden, so we'll just make the stylesheet in code and update it
const obj = document.createElement("style");

function set() {
  const now = new Date();
  const seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const hue = Math.floor((seconds / 86400) * 360);
  if (hue !== lastHue) {
    lastHue = hue;
    obj.innerHTML = `
:root {
  --custom-theme-base-color: hsl(${hue}, 100%, 90%);
  --custom-theme-base-color-amount: 100%;
  --custom-theme-base-color-hsl: ${hue} 100% 90%;
}
`.trim();
  }
}

set();
document.head.appendChild(obj);

setInterval(set, 1000);
