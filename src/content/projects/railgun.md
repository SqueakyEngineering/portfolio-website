---
title: "Railgun (in progress)"
description: "I'm building a railgun with an experimental low-voltage design."
publishDate: "2026-01-15"
dateLabel: "2025-Present"
featured: true
status: "HOBBY PROJECT"
stack:
  - SolidWorks
  - Arduino
  - Rapid Prototyping
  - "Mathematica"
  - "3D Printing"
  - "Hands-on Fabrication"
cardImage: "/images/railgun-card.svg"
order: 1
seoTitle: "Railgun (in progress)"
seoDescription: "Case study for an experimental low-voltage railgun design."
---

<section class="railgun-staggered-grid railgun-page-staggered">
  <div class="railgun-text-box railgun-text-box--top">
    <h2></h2>
    <p>I've been obsessed with railguns since middle school. I decided to actually build one in 2025 after some making some design sketches and feasibility calculations on a notepad.</p>
  </div>
  <figure class="railgun-math-image railgun-math-image--upper">
    <img src="/images/math1.jpg" alt="Handwritten railgun math notes and calculations" />
  </figure>
  <figure class="railgun-math-image railgun-math-image--lower">
    <img src="/images/railgun-barrel-assembly-drawing.png" alt="Railgun barrel assembly drawing" />
  </figure>
  <div class="railgun-text-box railgun-text-box--bottom">
    <h2></h2>
    <p>Nearly all of my initial assumptions were wrong, and I learned that the hard way. I’ve been building, testing, and redesigning for over a year, becoming intimately acquainted with the (somewhat) practical application of kinematics and E&M. After hundreds of design changes, I've finally got a design I'm (tentatively) happy with.</p>
  </div>
</section>

<section class="railgun-design-grid railgun-page-design">
  <div class="railgun-text-box">
    <h2></h2>
    <p>My design's uniqueness comes from using neodymium magnets to generate the magnetic field instead of inducing it purely from the current in the rails. This means I need just 1% of the current typical hobby railguns use, allowing me to get away with slightly increasing the resistance of the armature by adding graphite sliders and a spring-loading mechanism. This makes the railgun much less prone to the levels of rail wear that usually make them unfeasible.</p>
  </div>
  <figure class="railgun-inline-image">
    <img class="railgun-inline-image__base" src="/images/railgun-contact-assembly.png" alt="SolidWorks model of the railgun contact assembly with copper rods and black side plates" />
    <img class="railgun-inline-image__hover" src="/images/railgun-contact-assembly-hover.png" alt="" aria-hidden="true" />
  </figure>
</section>

<figure class="railgun-math-image railgun-math-image--center railgun-math-image--wide railgun-page-video">
  <video src="/Railgun%20Animation.mp4" aria-label="Railgun animation" autoplay loop muted playsinline></video>
</figure>

<section class="railgun-summary-grid railgun-page-summary">
  <div class="railgun-text-box">
    <p>As much as I love this railgun, it’s got major weak points; the total static resistance is too high (~.25 Ω), the projectile efficiency is embarrassingly low (2.6%), and the armature is abysmally un-aerodynamic. I'm looking forward to solving these problems in V2!</p>
  </div>
</section>
