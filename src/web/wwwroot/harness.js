const eventSource = new window.EventSource('/api/pslight/?markers=writable');
const GAMMA = 0.6;

eventSource.addEventListener('complete', () => {
    eventSource.close();
});

eventSource.addEventListener('message', (intialMessage) => {
    const intialData = JSON.parse(intialMessage.data);
    const updater = createView(intialData, document.querySelector('main'), '/api', {});

    eventSource.addEventListener('message', (message) => {
        updater(JSON.parse(message.data));
    });
}, { once: true });


function createElement(parent, type, text) {
    const el = document.createElement(type);
    if (text) {
        el.innerText = text
    }
    parent.appendChild(el);
    return el;
}

function fixGamma(value) {
    return 0 |
        Math.round((((value >> 0x00) & 0xFF) / 0xFF) ** GAMMA * 0xFF) << 0x00 |
        Math.round((((value >> 0x08) & 0xFF) / 0xFF) ** GAMMA * 0xFF) << 0x08 |
        Math.round((((value >> 0x10) & 0xFF) / 0xFF) ** GAMMA * 0xFF) << 0x10;
}

function createView(object, container, path) {
    const updaters = {};
    for (const [name, value] of Object.entries(object).filter(([name]) => !name.endsWith('$writable'))) {
        const writable = object[name + '$writable'] === true;

        if (value && typeof value === 'object') {
            const details = createElement(container, 'details');
            const summary = createElement(details, 'summary');
            if (name !== 'lights') {
                details.setAttribute('open', true);
            }
            createElement(summary, 'label', name);

            if (!Array.isArray(value)) {
                updaters[name] = createView(value, details, `${path}/${name}`);
            } else {
                const list = createElement(details, 'ol');
                const listItems = value.map(() => createElement(list, 'li'));
                if (name === 'lights') {
                    details.classList.add('lights');
                    const lights = createElement(summary, 'span');
                    const scale = 2;
                    lights.style.width = value.length * scale + 'px';
                    updaters[name] = (v) => {
                        lights.style.background = 'linear-gradient(to right, ' + v.map((l, i) => '#' + fixGamma(l).toString(16).padStart(6, '0') + ' ' + (i * 2) + 'px').join(', ') + ')';
                        listItems.forEach((el, i) => el.innerText = '0x' + v[i].toString(16).padStart(6, '0'));
                    };
                } else {
                    updaters[name] = (v) => {
                        listItems.forEach((el, i) => el.innerText = JSON.stringify(v[i]));
                    };
                }
                updaters[name](value);
            }
        } else {
            createElement(container, 'label', name);
            const code = createElement(container, typeof value === 'string' ? 'span' : 'u');
            const text = document.createTextNode('');
            code.appendChild(text);
            let current = value;
            updaters[name] = (v) => { text.data = v.toString(); current = v; };

            if (writable && typeof value === 'boolean') {
                code.setAttribute('role', 'checkbox');
                code.setAttribute('aria-checked', value);
                code.setAttribute('tab-index', '1');
                code.addEventListener('click', () => {
                    code.setAttribute('disabled', true);
                    send(`${path}/${name}`, { [name]: !current });
                });
                updaters[name] = (v) => { text.data = v.toString(); current = v; code.setAttribute('aria-checked', v); code.removeAttribute('disabled') };
            } else if (writable && typeof value === 'number') {
                var slider = createElement(code, 'input');
                slider.type = "range";
                slider.min = "0";
                slider.max = "1";
                slider.step = "0.25";
                slider.value = current;
                slider.addEventListener('input', () => {
                    send(`${path}/${name}`, { [name]: +slider.value });
                })
                updaters[name] = (v) => { text.data = v.toFixed(2); current = v; slider.value = v };
            }
            updaters[name](value);
        }
    }

    return function update(partial) {
        for (const [name, value] of Object.entries(partial)) {
            updaters[name]?.(value);
        }
    }
}

function send(url, data) {
    const body = JSON.stringify(data);
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body
    });
}
