'use strict';

const ws = new WebSocket('ws://localhost:8085/ws');

ws.onmessage = (event) => {
    if (event.data.startsWith('l:')) {
        const colors = event.data.substr(2).split('-');
        const strip = document.getElementsByTagName("main")[0];
        while (strip.childElementCount < colors.length) {
            strip.appendChild(document.createElement("span"))
        }
        strip.childNodes.forEach((el, i) => el.style.backgroundColor = `#${colors[i]}`);
    } else {
        const type = event.data.charAt(0);
        const enabled = event.data.charAt(2) == "1";
        if (type === 'm') {
            document.getElementById('controls').dataset.supportMockedClients = enabled;
        } else if (type === 'r') {
            document.getElementById('controls').classList.toggle('loading', !enabled);
        } else {
            (document.getElementById(`cb_${type}`) ?? {}).checked = enabled;
        }
    }
};

ws.onclose = () => {
    document.body.classList.add('disconnected');
    for (const el of document.getElementsByTagName("input")) {
        el.disabled = true;
    }
}