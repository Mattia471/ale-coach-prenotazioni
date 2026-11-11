# ALE COACH · Minimal Focus prototype

This is an isolated, interactive UI exploration on the branch \`prototype/minimal-focus\`.

## Preview

The root path (\`/\`) of this branch's Vercel preview opens the Minimal Focus prototype. The functional pre-existing application remains accessible at \`/?original=1\`. Neither the preview UI nor its sample buttons write to Supabase or Stripe.

The production branch \`main\` is not changed.

## Navigation

- **Athlete:** Oggi, Prenota, Lezioni, Profilo.
- **Coach:** Riepilogo, Agenda, Clienti, Gestione.
- Desktop: quiet left-side navigation; mobile: four-item bottom navigation.
- The calendar is a compact selectable week, with the agenda for the chosen date below.
- Management sub-sections (requests, hours, services, notifications) remain separated from the coach's daily overview.
- "Atleta / Coach" selector is part of the prototype only, to review both experiences without changing real account roles.

## Deliberately outside scope

- Hevy, exercise programs and workout tracking.
- Supabase migrations, authentication, pricing, business rules, payments, real bookings or production configuration.
- Any actual client data: all names, appointments and button outcomes in the prototype are simulated.

## Release approach

After approval, integrate the chosen layout into the existing authenticated components, remove demo-only state, validate real booking flows and run tests. Do not merge the prototype screen as the final production application.
