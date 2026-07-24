# DJ ELECTRONICS Website

Static multilingual company website for `CÔNG TY TNHH THIẾT BỊ ĐIỆN TỬ DJ / DJ ELECTRONICS CO., LTD`.

The site supports Vietnamese, English, and Chinese. Vietnamese is the default language.

## Local Preview

This version loads content from JSON files, so preview it through a local server instead of opening `index.html` directly.

```bash
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173/
http://localhost:4173/admin/
```

## Structure

- `index.html`: static page shell.
- `styles.css`: responsive visual styling.
- `script.js`: hash routing, language switching, and rendering.
- `content/`: editable site content in JSON.
- `admin/`: Decap CMS admin entry and configuration.
- `assets/`: website images and CMS upload folder.
- `docs/部署说明.md`: Netlify deployment and CMS login guide.

## CMS

The admin panel is built with Decap CMS and is intended for Netlify Identity + Git Gateway.

Online admin URL after deployment:

```text
https://your-domain/admin/
```

CMS uploads new images to:

```text
assets/cms/
```

## Deployment

No build step is required. Deploy the repository root to Netlify.

Netlify settings:

- Build command: empty
- Publish directory: repository root

Then enable:

- Netlify Identity
- Invite only registration
- Git Gateway
