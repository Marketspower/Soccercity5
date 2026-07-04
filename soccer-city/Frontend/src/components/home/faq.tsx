"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "@/components/motion/reveal";
import { FAQ as ITEMS } from "@/lib/data";

export function Faq() {
  return (
    <section id="faq" className="container max-w-3xl py-24 md:py-32">
      <Reveal className="mb-10 text-center">
        <p className="speed-eyebrow mb-4 justify-center">FAQ</p>
        <h2 className="display text-4xl sm:text-5xl">Questions <span className="text-primary">fréquentes</span></h2>
      </Reveal>

      <Reveal delay={0.1}>
        <Accordion type="single" collapsible className="w-full">
          {ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}