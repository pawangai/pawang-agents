---
version: alpha
name: Project Name
description: One line describing the visual identity.
colors:
  primary: "#1B2A41"
  secondary: "#5B6B7F"
  accent: "#E07A5F"
  surface: "#FFFFFF"
  on-surface: "#1A1C1E"
typography:
  heading-lg:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: 700
    lineHeight: 1.2
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 4px
  md: 8px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
---

<!--
Google DESIGN.md format (alpha). Front matter holds the exact tokens; prose holds the why. Owned by `/design`; edit freely, then run `npx -y @google/design.md lint DESIGN.md`. Keep sections in this order, omit the ones you don't need, never duplicate a heading. Delete this comment and all placeholder values once real.
-->

## Overview

The personality and intent of the interface in a few sentences. Who it is for and the feeling it should create.

## Colors

- **Primary:** where it is used and why.
- **Accent:** the only color used for primary actions.

## Typography

Type families, scale, and when each style applies.

## Layout

Grid, spacing rhythm, breakpoints, and density.

## Elevation & Depth

How surfaces are separated: shadows, borders, or tonal layers.

## Shapes

Corner radius and shape language.

## Components

Each component named in the front matter: purpose, states, and variants (`button-primary`, `button-primary-hover`).

## Do's and Don'ts

- Do: concrete rules that keep the design consistent.
- Don't: patterns an agent tends to produce by default that this design rejects.
