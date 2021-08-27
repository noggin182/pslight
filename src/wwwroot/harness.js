
const eventSource = new window.EventSource('/api/pslight/?markers=writable');
const updaters = {};

eventSource.addEventListener('complete', () => {
    eventSource.close();
});

eventSource.onmessage = (message) => {
    const data = JSON.parse(message.data, {});
    if (!updaters.pslight) {
        createView(data, document.querySelector('main'), [], updaters);
    } else {
        updaters.pslight(data.pslight);
    }
}

function createLabel(text) {
    const lbl = document.createElement('label');
    lbl.innerText = text;
    return lbl;
}

function createElement(parent, type) {
    const el = document.createElement(type);
    parent.appendChild(el);
    return el;
}

function createView(object, container, path, updaters) {
    for (const [name, value] of Object.entries(object).filter(([name]) => !name.endsWith('$writable'))) {
        const writable = object[name + '$writable'] === true;

        if (value && typeof value === 'object' && !Array.isArray(value)) {

            const details = document.createElement('details');
            details.setAttribute('open', true);
            const summary = document.createElement('summary');
            summary.appendChild(createLabel(name));
            details.appendChild(summary);
            container.appendChild(details);

            const childUpdaters = {};

            createView(value, details, [...path, name], childUpdaters);
            updaters[name] = (v) => {
                for (const [childName, childValue] of Object.entries(v)) {
                    childUpdaters[childName]?.(childValue);
                }
            };



        } else if (name === 'lights') {
            const details = document.createElement('details');
            const summary = document.createElement('summary');

            details.classList.add('lights');
            summary.appendChild(createLabel(name));
            details.appendChild(summary);
            container.appendChild(details);

            const list = document.createElement('ol');
            details.appendChild(list);
            const listItems = value.map(() => createElement(list, 'li'));

            const lights = document.createElement('span');
            summary.appendChild(document.createTextNode('['));
            summary.appendChild(lights);
            summary.appendChild(document.createTextNode('] '));
            const scale = 2;
            lights.style.width = value.length * scale + 'px';

            (updaters[name] = (v) => {
                lights.style.background = 'linear-gradient(to right, ' + v.map((l, i) => '#' + l.toString(16).padStart(6, '0') + ' ' + (i * 2) + 'px').join(', ') + ')';
                listItems.forEach((el, i) => el.innerText = '0x' + v[i].toString(16).padStart(6, '0'));
            })(value);

        } else {
            container.appendChild(createLabel(name));

            const code = document.createElement(typeof value === 'string' ? 'span' : 'u');
            container.appendChild(code);
            const text = document.createTextNode(value.toString());
            code.appendChild(text);
            let current = value;
            updaters[name] = (v) => { text.data = v.toString(); current = v; };

            if (writable && typeof value === 'boolean') {
                const btn = document.createElement('button');
                btn.innerText = 'Toggle';
                btn.addEventListener('click', () => {
                    send(path.join('/') + '/' + name, { [name]: !current });
                });
                code.appendChild(btn);
            }
        }
    }
}


function send(url, data) {
    const body = JSON.stringify(data);
    fetch('/api/' + url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body
    });
}