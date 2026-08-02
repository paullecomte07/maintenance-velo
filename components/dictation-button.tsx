"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

// L'API Web Speech n'est pas dans les types du DOM : on décrit le strict
// minimum dont on se sert.
type SpeechResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Dictée vocale d'un champ texte, par l'API Web Speech du navigateur : aucune
 * clé d'API, aucun coût, rien qui transite par notre serveur.
 *
 * Deux partis pris qui comptent :
 *
 *   - **Le bouton n'existe pas si le navigateur ne sait pas écouter** (Firefox
 *     notamment). Un micro qui ne fait rien est pire que pas de micro.
 *   - **Le texte reconnu s'ajoute** à l'existant plutôt que de l'écraser : la
 *     transcription se trompe sur le vocabulaire du cycle, et on dicte souvent
 *     en plusieurs fois.
 */
export function DictationButton({
  onTranscript,
  label = "la note",
}: {
  onTranscript: (text: string) => void;
  label?: string;
}) {
  // Décidé après le montage : le rendu serveur ne connaît pas le navigateur,
  // et trancher trop tôt provoquerait une différence d'hydratation.
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getConstructor() !== null);
    return () => recognitionRef.current?.stop();
  }, []);

  if (!supported) return null;

  function start() {
    const Recognition = getConstructor();
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      let texte = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) texte += result[0].transcript;
      }
      if (texte.trim()) onTranscript(texte.trim());
    };

    recognition.onerror = (event) => {
      setListening(false);
      recognitionRef.current = null;
      if (event.error === "no-speech" || event.error === "aborted") return;
      toast.error(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Accès au micro refusé. Autorise-le dans ton navigateur, ou saisis la note au clavier."
          : "La dictée a échoué. Tu peux saisir la note au clavier."
      );
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function stop() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={listening ? "default" : "outline"}
      // Le libellé dit l'état, plutôt que de le confier à la seule couleur.
      aria-label={listening ? `Arrêter la dictée de ${label}` : `Dicter ${label}`}
      aria-pressed={listening}
      onClick={() => (listening ? stop() : start())}
    >
      {listening ? (
        <>
          <Square aria-hidden="true" />
          Arrêter
        </>
      ) : (
        <>
          <Mic aria-hidden="true" />
          Dicter
        </>
      )}
    </Button>
  );
}
