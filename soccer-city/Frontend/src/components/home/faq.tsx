"use client";

import { useEffect, useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { CONTACT } from "@/lib/data";

interface FaqItem { id: string; question: string; answer: string }

/** FAQ gérée dans Admin → FAQ (questions publiées uniquement). */
export function Faq() {
  const [items, setItems] = useState<FaqItem[]>([]);

  useEffect(() => {
    supabase
      .from("faqs")
      .select("id, question, answer")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setItems((data as FaqItem[]) || []));
  }, []);

  const whatsapp = `https://wa.me/${CONTACT.whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent("Bonjour Soccer City, j'ai une question : ")}`;

  return (
    <section id="faq" className="container max-w-3xl py-24 md:py-32">
      <Reveal className="mb-10 text-center">
        <p className="speed-eyebrow mb-4 justify-center">FAQ</p>
        <h2 className="display text-4xl sm:text-5xl">Questions <span className="text-primary">fréquentes</span></h2>
      </Reveal>

      {items.length > 0 && (
        <Reveal delay={0.1}>
          <Accordion type="single" collapsible className="w-full">
            {items.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>
                  <span className="whitespace-pre-line">{item.answer}</span>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      )}

      {/* Le client ne trouve pas sa réponse : WhatsApp ou formulaire de contact */}
      <div className="mt-10 rounded-lg border bg-card p-6 text-center">
        <p className="font-semibold">Vous ne trouvez pas votre réponse ?</p>
        <p className="mt-1 text-sm text-muted-foreground">Posez-nous votre question, nous vous répondons rapidement.</p>
        <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="brand">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" /> Écrire sur WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/#contact">
              <Mail className="size-4" /> Poser ma question par courriel
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
