# Alterworld Enterprises portfolio

A static, responsive product portfolio with the selected Alterworld logo, six product links, GitHub and itch.io profile links, and a contact form. The page uses the brand rather than a personal name. The recipient email is present in the contact form action; no mailbox password or API key is included.

## Contact form

The form in `dist/index.html` sends name, reply email, and message to `jason.jones@alterworldenterprises.com` through https://formsubmit.co/. Native HTML validation requires all three fields. FormSubmit's default reCAPTCHA remains enabled, with an additional hidden honeypot. No automatic reply is sent to the visitor. FormSubmit handles submission errors; successful submissions return to `https://www.alterworldenterprises.com/contact-thanks.html`.

Activation is required: submit the form once and confirm the activation email in the recipient inbox. If the mailbox is still being provisioned, complete activation once Outlook works. Until confirmed, delivery is not verified. After activation, submit a fresh test and verify it reaches the inbox and Reply addresses the visitor. FormSubmit can provide an opaque endpoint in its confirmation email to replace the recipient address in the public form action.

Contact submissions are processed by FormSubmit, whose documentation states it retains submissions for 30 days. The public form discloses this delivery provider. See https://formsubmit.co/documentation. Both the Azure site and Sites preview use this same form; the confirmation redirect goes to the public Azure website.

## Content

- Cage Grind: https://cagegrind.com/ — repository `jayjonesvip/cage-warrior`.
- ZomVox: https://zomvox.com/.
- PitBlend: https://pitblend.com/ — repository `jayjonesvip/RubLab`.
- FantasyToolbelt: https://fantasytoolbelt.com/ — repository `jayjonesvip/fantasy-football`.
- GitHub profile: https://github.com/jayjonesvip.
- itch.io profile: https://lightningjay.itch.io/.
- Desert Survival: https://lightningjay.itch.io/desert-survival.
- Alien Invasion: Cleveland: https://lightningjay.itch.io/alien-invasion-cleveland-rpg.

Edit `dist/index.html` for product text and links; edit `dist/styles.css` for styling. Everything in `dist/` can be deployed as static files. No install or build is required.

## Pipeline

The Pipeline section has two groups: In the works and Backlog. Each idea uses a short, one-line title and a two-sentence description. In the works lists Browser Football, SignalField, and FiveBucketTrader based on the user's project history. Backlog lists Garage Touchdown, BBS Door Game Ports, and Final Round Golf from the user's supplied idea list. These are prototypes and concepts, without release-date promises or unverified demo links.

To add an idea, put an `<article class="pipeline-item">` inside the relevant `.lane-items` group, with an `<h5>` title and a `<p>` containing two sentences. The headings may wrap on narrow screens to preserve readability.

## Azure deployment

The public site is deployed to Azure Static Web Apps at https://www.alterworldenterprises.com/ from the `main` branch of `jayjonesvip/alterworld-enterprises`. Its existing GitHub Actions workflow deploys `dist/` on each push. No Azure API is required for the contact form. For a new deployment elsewhere:

1. Put this folder in its own GitHub repository.
2. In the intended Azure account, create a Static Web App using the Free plan and connect that repository.
3. Choose the Custom build preset, set app location to `dist`, leave API location empty, and leave output location empty. There is no build step.
4. Test the Azure-provided URL before configuring a custom domain.
5. Add `alterworldenterprises.com` and/or `www.alterworldenterprises.com` through the Static Web App's Custom domains page. Use Azure's exact validation and routing records at your DNS provider. Preserve email MX, SPF, DKIM, DMARC, and unrelated records.

The `.openai/hosting.json` file identifies the separate private Sites preview; it is not Azure configuration. The `dist/staticwebapp.config.json` file supplies Azure response headers.

Microsoft references:
- https://learn.microsoft.com/en-us/azure/static-web-apps/getting-started?tabs=vanilla-javascript
- https://learn.microsoft.com/en-us/azure/static-web-apps/plans
- https://learn.microsoft.com/en-us/azure/static-web-apps/custom-domain

## Assets

Existing product artwork was obtained from the owner's supplied live products. Source URLs are recorded in `ASSETS.md`. The selected Threshold doorway symbol was prepared from option 1 with the built-in imagegen tool and has a transparent background. The website pairs it with a live-text wordmark for clarity and accessibility.

