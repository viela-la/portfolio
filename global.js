console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}
// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname,
// );
// currentLink.classList.add('current');
// if (currentLink) {
//   // or if (currentLink !== undefined)
//   currentLink?.classList.add('current');
// }
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/portfolio/";         // GitHub Pages repo name
let pages = [
    {url: '', title: 'Home'},
    {url: 'projects/', title: 'Projects'},
    {url: 'contact/', title: 'Contact'},
    {url: 'resume/', title: 'Resume'},
    {url: 'https://github.com/viela-la', title: 'GitHub'}
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;
    
    if (!url.startsWith('http')) {
    url = BASE_PATH + url;
    }
    
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;

    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add('current');
    }
    if (a.host !== location.host) {
        a.target = '_blank';
    }
    nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select id="theme-select">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
`
);

const select = document.querySelector('#theme-select');

select.addEventListener('change', () => {
  document.documentElement.style.colorScheme = select.value;

  // Save preference
  localStorage.setItem('theme', select.value);
});

const savedTheme = localStorage.getItem('theme');

if (savedTheme) {
  document.documentElement.style.colorScheme = savedTheme;
  select.value = savedTheme;
}

const isDarkMode = matchMedia("(prefers-color-scheme: dark)").matches;

// const autoOption = select.querySelector('option[value="light dark"]');
// autoOption.textContent = isDarkMode ? "Automatic" : "Automatic (Light)";
