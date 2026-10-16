# Jurni

Clickable HTML prototype of **Jurni** — a ride-connection app for Kingston,
St. Andrew & Portmore. This is the bare-bones **ride MVP**: rider, driver, and
admin flows, the signature **driver-distance bar** (free browser GPS, no maps
SDK), and a built-in **Emergency / SOS** feature. Brand: *"Move with ease."*

Mobile-responsive, dependency-free static **HTML / CSS / JS** — no backend, no
build step.

**Live site:** https://denisdbell.github.io/jurni/

## Run

```bash
cd docs
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `docs/index.html` in a browser. (The "Use my current location"
GPS feature needs a secure context, so prefer `http://localhost`.)

See [`docs/README.md`](docs/README.md) for the full screen map, the
end-to-end demo walkthrough, and what's simulated.
