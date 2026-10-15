/* A small line chart for the training progress screen.
 *
 * One series and one axis per chart: highest span and accuracy have different
 * scales, so they are always two charts, never a dual axis. The line carries
 * the task's color; every piece of text uses the text colors. Today's value is
 * labelled at the end of the line and the rest are in the tooltip and in the
 * table under the charts. Hover or keyboard focus (arrow keys) shows a
 * crosshair and a readout for any day.
 *
 *   lineChart({
 *     title: "Highest span",
 *     points: [{ label: "Day 1", detail: "Lesson 3 · Oct 14", value: 3 }, ...],
 *     yMax: 6, yStep: 1,
 *     format: function (v) { return String(v); },
 *   }) -> HTMLElement
 */

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(name, attrs) {
  const el = document.createElementNS(SVG_NS, name);
  Object.keys(attrs || {}).forEach(function (key) {
    el.setAttribute(key, attrs[key]);
  });
  return el;
}

function lineChart(opts) {
  const W = 340;
  const H = 196;
  const PAD = { l: 38, r: 22, t: 26, b: 34 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const points = opts.points;
  const n = points.length;
  const last = n - 1;

  const x = function (i) {
    return PAD.l + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
  };
  const y = function (v) {
    return PAD.t + plotH - (plotH * Math.min(v, opts.yMax)) / opts.yMax;
  };

  const figure = document.createElement("figure");
  figure.className = "chart";

  const caption = document.createElement("figcaption");
  caption.className = "chart-title";
  caption.textContent = opts.title;
  figure.appendChild(caption);

  const frame = document.createElement("div");
  frame.className = "chart-frame";
  figure.appendChild(frame);

  const svg = svgEl("svg", {
    viewBox: "0 0 " + W + " " + H,
    class: "chart-svg",
    role: "img",
    tabindex: "0",
    "aria-label":
      opts.title +
      ". " +
      points
        .map(function (p) {
          return p.label + " " + opts.format(p.value);
        })
        .join(", ") +
      ". Use the arrow keys to read each day.",
  });
  frame.appendChild(svg);

  /* grid and y ticks: hairline, solid, recessive */
  for (let v = 0; v <= opts.yMax + 1e-9; v += opts.yStep) {
    svg.appendChild(
      svgEl("line", { x1: PAD.l, x2: W - PAD.r, y1: y(v), y2: y(v), class: "chart-grid" })
    );
    const tick = svgEl("text", {
      x: PAD.l - 8,
      y: y(v),
      class: "chart-tick",
      "text-anchor": "end",
      "dominant-baseline": "middle",
    });
    tick.textContent = opts.format(v);
    svg.appendChild(tick);
  }

  /* x labels: every day while they fit, then thinned, always keeping today */
  const every = Math.max(1, Math.ceil(n / 7));
  points.forEach(function (p, i) {
    if (i % every !== 0 && i !== last) return;
    if (i !== last && last - i < every) return;
    const label = svgEl("text", {
      x: x(i),
      y: H - PAD.b + 18,
      class: "chart-tick" + (i === last ? " is-today" : ""),
      "text-anchor": "middle",
    });
    label.textContent = i === last ? "Today" : p.label;
    svg.appendChild(label);
  });

  /* area wash and line */
  if (n > 1) {
    const linePath = points
      .map(function (p, i) {
        return (i === 0 ? "M" : "L") + x(i) + " " + y(p.value);
      })
      .join(" ");
    svg.appendChild(
      svgEl("path", {
        d: linePath + " L" + x(last) + " " + y(0) + " L" + x(0) + " " + y(0) + " Z",
        class: "chart-area",
      })
    );
    svg.appendChild(svgEl("path", { d: linePath, class: "chart-line" }));
  }

  /* crosshair, drawn under the points */
  const crosshair = svgEl("line", {
    y1: PAD.t,
    y2: PAD.t + plotH,
    class: "chart-crosshair",
    visibility: "hidden",
  });
  svg.appendChild(crosshair);

  /* points: surface-ringed dots, today's larger */
  const dots = points.map(function (p, i) {
    const dot = svgEl("circle", {
      cx: x(i),
      cy: y(p.value),
      r: i === last ? 6 : 4,
      class: "chart-dot" + (i === last ? " is-today" : ""),
    });
    svg.appendChild(dot);
    return dot;
  });

  /* today's value, directly labelled; kept inside the plot at the top */
  const endLabel = svgEl("text", {
    x: x(last),
    y: Math.max(y(points[last].value) - 12, 12),
    class: "chart-end",
    "text-anchor": n === 1 ? "middle" : "end",
  });
  endLabel.textContent = opts.format(points[last].value);
  svg.appendChild(endLabel);

  /* tooltip: value first, then the day */
  const tip = document.createElement("div");
  tip.className = "chart-tip";
  tip.hidden = true;
  const tipValue = document.createElement("strong");
  const tipDay = document.createElement("span");
  tip.appendChild(tipValue);
  tip.appendChild(tipDay);
  frame.appendChild(tip);

  let active = -1;

  function show(i) {
    active = i;
    const p = points[i];
    crosshair.setAttribute("x1", x(i));
    crosshair.setAttribute("x2", x(i));
    crosshair.setAttribute("visibility", "visible");
    dots.forEach(function (dot, k) {
      dot.classList.toggle("is-active", k === i);
    });
    tipValue.textContent = opts.format(p.value);
    tipDay.textContent = (i === last ? "Today" : p.label) + (p.detail ? " · " + p.detail : "");
    tip.hidden = false;
    /* position in the frame's own pixels, flipped to stay inside the card */
    const scale = svg.getBoundingClientRect().width / W;
    const left = x(i) * scale;
    tip.style.left = left + "px";
    tip.style.top = y(p.value) * scale + "px";
    tip.classList.toggle("is-left", left > frame.clientWidth * 0.6);
  }

  function hide() {
    active = -1;
    crosshair.setAttribute("visibility", "hidden");
    dots.forEach(function (dot) {
      dot.classList.remove("is-active");
    });
    tip.hidden = true;
  }

  /* the crosshair finds the nearest day; the pointer never has to hit a dot */
  svg.addEventListener("pointermove", function (event) {
    const rect = svg.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < n; i += 1) {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    }
    show(best);
  });
  svg.addEventListener("pointerleave", hide);
  svg.addEventListener("focus", function () {
    show(active === -1 ? last : active);
  });
  svg.addEventListener("blur", hide);
  svg.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      show(Math.max(0, Math.min(last, (active === -1 ? last : active) + step)));
    } else if (event.key === "Escape") {
      hide();
    }
  });

  return figure;
}
