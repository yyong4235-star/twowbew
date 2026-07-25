let siteConfig = null;
let company = null;
let copy = null;
let privacyPolicies = null;
let userAgreements = null;

const routes = ["home", "products", "manufacturing", "oem", "about", "contact", "privacy", "terms"];
const languages = ["vi", "en", "zh"];

let state = {
  lang: localStorage.getItem("dj-lang") || "vi",
  route: normalizeRoute(window.location.hash.replace("#", "")),
};

function normalizeRoute(route) {
  return routes.includes(route) ? route : "home";
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

async function loadContent() {
  const [site, vi, en, zh, privacyVi, privacyEn, privacyZh, termsVi, termsEn, termsZh] = await Promise.all([
    loadJson("./content/site.json"),
    loadJson("./content/pages/vi.json"),
    loadJson("./content/pages/en.json"),
    loadJson("./content/pages/zh.json"),
    loadJson("./content/privacy/vi.json"),
    loadJson("./content/privacy/en.json"),
    loadJson("./content/privacy/zh.json"),
    loadJson("./content/terms/vi.json"),
    loadJson("./content/terms/en.json"),
    loadJson("./content/terms/zh.json"),
  ]);

  siteConfig = site;
  company = site.company;
  copy = { vi, en, zh };
  privacyPolicies = { vi: privacyVi, en: privacyEn, zh: privacyZh };
  userAgreements = { vi: termsVi, en: termsEn, zh: termsZh };
}

function getImages(key) {
  const images = siteConfig?.assets?.[key] || [];
  return images.map((item) => (typeof item === "string" ? item : item.image)).filter(Boolean);
}

function getAsset(key) {
  return siteConfig?.assets?.[key] || "";
}

function pairValues(item, firstKey, secondKey) {
  return Array.isArray(item) ? item : [item[firstKey], item[secondKey]];
}

function t() {
  return copy?.[state.lang];
}

function card(item, index, images = getImages("productImages")) {
  const fallbackImages = getImages("productImages");
  const imageSet = Array.isArray(images) && typeof images[0] === "string" ? images : fallbackImages;
  const image = imageSet[index % imageSet.length];
  const tags = [...(item.tags || []), ...(item.applications || []), ...(item.capabilities || [])]
    .map((tag) => `<span class="tag">${tag}</span>`)
    .join("");
  return `
    <article class="card">
      <img class="card-image" src="${image}" alt="${item.title || item.name || item.mode}" loading="lazy" />
      <span class="icon">${String(index + 1).padStart(2, "0")}</span>
      <h3>${item.title || item.name || item.mode}</h3>
      <p>${item.text || item.description}</p>
      ${item.customerValue ? `<p><strong>${item.customerValue}</strong></p>` : ""}
      ${item.bestFor ? `<p><strong>${item.bestFor}</strong></p>` : ""}
      ${tags ? `<div class="tag-list">${tags}</div>` : ""}
    </article>
  `;
}

function sectionHead(data) {
  return `
    <div class="section-head">
      <div>
        <span class="eyebrow">${data.eyebrow}</span>
        <h2>${data.title}</h2>
      </div>
      <p>${data.intro}</p>
    </div>
  `;
}

function renderHome(data) {
  return `
    <section class="hero" style="--hero-bg:url('${getAsset("heroBackground")}')">
      <div class="hero-inner">
        <div>
          <span class="eyebrow">${data.home.eyebrow}</span>
          <h1>${data.home.title}</h1>
          <p>${data.home.intro}</p>
          <div class="hero-actions">
            <a class="primary-btn" href="#contact">${data.cta.contact}</a>
            <a class="secondary-btn" href="#products">${data.cta.products}</a>
          </div>
        </div>
        <aside class="hero-panel">
          <h2>${data.home.panelTitle}</h2>
          <div class="metric-grid">
            ${data.home.metrics.map((item) => {
              const [label, text] = pairValues(item, "label", "text");
              return `<div class="metric"><strong>${label}</strong><span>${text}</span></div>`;
            }).join("")}
          </div>
        </aside>
      </div>
    </section>
    <section class="section home-solutions">
      <div class="section-inner">
        <div class="section-head">
          <div>
            <span class="eyebrow">DJ ELECTRONICS</span>
            <h2>${data.home.sectionsTitle}</h2>
          </div>
          <p>${data.home.sectionsIntro}</p>
        </div>
        <div class="grid">${data.home.highlights.map((item, index) => card(item, index, getImages("homeImages"))).join("")}</div>
      </div>
    </section>
    ${renderContactBand(data)}
  `;
}

function renderProducts(data) {
  return `
    <section class="section dark">
      <div class="section-inner">
        ${sectionHead(data.products)}
        <div class="grid">${data.products.items.map(card).join("")}</div>
      </div>
    </section>
    ${renderContactBand(data)}
  `;
}

function renderManufacturing(data) {
  return `
    <section class="section">
      <div class="section-inner split">
        <div class="split-copy">
          <span class="eyebrow">${data.manufacturing.eyebrow}</span>
          <h2>${data.manufacturing.splitTitle}</h2>
          <p>${data.manufacturing.splitText}</p>
          <a class="primary-btn" href="#contact">${data.cta.contact}</a>
        </div>
        <div class="split-media" style="background-image:url('${getAsset("manufacturingSplit")}')"></div>
      </div>
    </section>
    <section class="section alt">
      <div class="section-inner">
        ${sectionHead(data.manufacturing)}
        <div class="grid">${data.manufacturing.capabilities.map((item, index) => card(item, index, getImages("manufacturingImages"))).join("")}</div>
      </div>
    </section>
  `;
}

function renderOem(data) {
  return `
    <section class="section dark">
      <div class="section-inner">
        ${sectionHead(data.oem)}
        <div class="grid">${data.oem.modes.map((item, index) => card(item, index, getImages("oemImages"))).join("")}</div>
      </div>
    </section>
    <section class="section">
      <div class="section-inner split">
        <div class="split-media" style="background-image:url('${getAsset("oemSplit")}')"></div>
        <div class="split-copy">
          <h2>${data.oem.processTitle}</h2>
          <div class="process-list">
            ${data.oem.process.map((item) => {
              const [title, text] = pairValues(item, "title", "text");
              return `<div class="process-item"><div><h3>${title}</h3><p>${text}</p></div></div>`;
            }).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderAbout(data) {
  return `
    <section class="section">
      <div class="section-inner split">
        <div class="split-copy">
          <span class="eyebrow">${data.about.eyebrow}</span>
          <h2>${data.about.title}</h2>
          <p>${data.about.intro}</p>
          <p>${data.about.body}</p>
        </div>
        <div class="split-media" style="background-image:url('${getAsset("aboutMain")}')"></div>
      </div>
    </section>
    <section class="section alt">
      <div class="section-inner">
        <div class="contact-details">
          ${data.about.facts.map((item) => {
            const [label, value] = pairValues(item, "label", "value");
            return `<div class="detail-card"><span>${label}</span><strong>${value}</strong></div>`;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderContact(data) {
  return `
    <section class="section dark">
      <div class="section-inner">
        ${sectionHead(data.contact)}
        <div class="contact-details">
          <div class="detail-card"><span>${data.contact.details.phone}</span><a href="tel:${company.phoneHref}">${company.phone}</a></div>
          <div class="detail-card"><span>${data.contact.details.email}</span><a href="mailto:${company.email}">${company.email}</a></div>
          <div class="detail-card"><span>${data.contact.details.address}</span><strong>${company.legalNameVi}</strong><strong>${company.legalNameEn}</strong><strong>${company.address}</strong></div>
        </div>
        <div class="policy-links">
          <a class="privacy-card" href="#privacy">
            <span>${data.contact.privacyLabel}</span>
            <strong>${data.contact.privacyText}</strong>
          </a>
          <a class="privacy-card" href="#terms">
            <span>${data.contact.termsLabel}</span>
            <strong>${data.contact.termsText}</strong>
          </a>
        </div>
      </div>
    </section>
  `;
}

function renderPrivacy() {
  const policy = privacyPolicies[state.lang];
  return `
    <section class="section privacy-section">
      <div class="section-inner privacy-shell">
        <div class="privacy-hero">
          <span class="eyebrow">BMS Protection Board Manager</span>
          <h1>${policy.title}</h1>
          <p>${policy.subtitle}</p>
          <small>${policy.updated}</small>
        </div>
        <div class="privacy-content">
          ${policy.sections.map((section) => {
            const title = Array.isArray(section) ? section[0] : section.title;
            const text = Array.isArray(section) ? section[1] : section.text;
            return `<article><h2>${title}</h2><p>${text}</p></article>`;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderTerms() {
  const agreement = userAgreements[state.lang];
  return `
    <section class="section privacy-section">
      <div class="section-inner privacy-shell">
        <div class="privacy-hero">
          <span class="eyebrow">BMS Protection Board Manager</span>
          <h1>${agreement.title}</h1>
          <p>${agreement.subtitle}</p>
          <small>${agreement.updated}</small>
        </div>
        <div class="privacy-content">
          ${agreement.sections.map((section) => {
            const title = Array.isArray(section) ? section[0] : section.title;
            const text = Array.isArray(section) ? section[1] : section.text;
            return `<article><h2>${title}</h2><p>${text}</p></article>`;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderFooter(data) {
  return `
    <div>
      <strong>${company.shortName}</strong>
      <span>${company.legalNameVi}</span>
      <span>${company.address}</span>
      <a href="#privacy">${data.contact.privacyLabel}</a>
      <a href="#terms">${data.contact.termsLabel}</a>
    </div>
  `;
}

function renderContactBand(data) {
  return `
    <section class="section home-contact-flow">
      <div class="section-inner">
        <div class="contact-band" style="background-image:linear-gradient(135deg, rgba(6, 31, 47, 0.94), rgba(17, 107, 126, 0.82), rgba(48, 166, 121, 0.76)), url('${getAsset("contactBand")}')">
          <div class="prism-layer" aria-hidden="true">
            <span class="prism-core"></span>
            <span class="prism-ray prism-ray-a"></span>
            <span class="prism-ray prism-ray-b"></span>
          </div>
          <div>
            <h2>${data.home.bandTitle}</h2>
            <p>${data.home.bandText}</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function render() {
  const data = t();
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : state.lang;
  document.body.dataset.currentRoute = state.route;
  document.title = data.metaTitle;
  const logo = document.querySelector(".brand-mark img");
  if (logo && getAsset("logo")) {
    logo.src = getAsset("logo");
  }
  document.querySelector(".header-cta").textContent = data.cta.contact;
  document.querySelector("#site-footer").innerHTML = renderFooter(data);

  document.querySelectorAll(".main-nav [data-route]").forEach((link) => {
    const route = link.dataset.route;
    link.textContent = data.nav[route];
    link.setAttribute("aria-current", route === state.route ? "page" : "false");
  });

  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.lang === state.lang));
  });

  const renderers = {
    home: renderHome,
    products: renderProducts,
    manufacturing: renderManufacturing,
    oem: renderOem,
    about: renderAbout,
    contact: renderContact,
    privacy: renderPrivacy,
    terms: renderTerms,
  };
  document.querySelector("#app").innerHTML = renderers[state.route](data);
  document.querySelector("#app").focus({ preventScroll: true });
}

window.addEventListener("hashchange", () => {
  if (!copy) return;
  state.route = normalizeRoute(window.location.hash.replace("#", ""));
  document.querySelector(".site-header").dataset.open = "false";
  document.querySelector(".menu-toggle").setAttribute("aria-expanded", "false");
  render();
});

document.querySelectorAll("[data-lang]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!copy) return;
    state.lang = button.dataset.lang;
    localStorage.setItem("dj-lang", state.lang);
    render();
  });
});

document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelector(".site-header").dataset.open = "false";
    document.querySelector(".menu-toggle").setAttribute("aria-expanded", "false");
  });
});

document.querySelector(".menu-toggle").addEventListener("click", () => {
  const header = document.querySelector(".site-header");
  const isOpen = header.dataset.open === "true";
  header.dataset.open = String(!isOpen);
  document.querySelector(".menu-toggle").setAttribute("aria-expanded", String(!isOpen));
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelector(".site-header").dataset.open = "false";
  document.querySelector(".menu-toggle").setAttribute("aria-expanded", "false");
});

window.addEventListener("scroll", () => {
  document.querySelector(".site-header").dataset.elevated = String(window.scrollY > 8);
});

function renderLoading() {
  document.querySelector("#app").innerHTML = `
    <section class="loading-state">
      <div>
        <h1>Loading website content</h1>
        <p>Please wait while the site content is loaded.</p>
      </div>
    </section>
  `;
}

function renderError(error) {
  document.querySelector("#app").innerHTML = `
    <section class="error-state">
      <div>
        <h1>Website content could not be loaded</h1>
        <p>${error.message}</p>
      </div>
    </section>
  `;
}

async function init() {
  renderLoading();
  try {
    await loadContent();
    if (!window.location.hash) {
      window.location.hash = "home";
      return;
    }
    render();
  } catch (error) {
    console.error(error);
    renderError(error);
  }
}

init();
