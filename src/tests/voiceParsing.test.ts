import { describe, it, expect } from "vitest";
import { parseSpokenText } from "../components/VoiceSaleInputModal";
import { converterExtensoParaNumero } from "../utils/formatters";

describe("Voice Input & Number Parsing", () => {
  it("converts numbers in full text correctly", () => {
    expect(converterExtensoParaNumero("cento e cinquenta")).toBe(150);
    expect(converterExtensoParaNumero("duzentos e noventa e nove")).toBe(299);
    expect(converterExtensoParaNumero("duzentos reais e cinquenta centavos")).toBe(200.5);
    expect(converterExtensoParaNumero("oitenta e nove reais e noventa")).toBe(89.9);
  });

  it("extracts values, pairs, aggregates, and category from spoken sentences", () => {
    const sale1 = parseSpokenText("199,90 um par tenis feminino e uma meia");
    expect(sale1.valorStr).toBe("199,90");
    expect(sale1.paresStr).toBe("1");
    expect(sale1.agregadosStr).toBe("1");
    expect(sale1.categoria).toBe("Esportivo");

    const sale2 = parseSpokenText("duzentos e oitenta reais dois pares calçado infantil");
    expect(sale2.valorStr).toBe("280,00");
    expect(sale2.paresStr).toBe("2");
    expect(sale2.categoria).toBe("Infantil");

    const sale3 = parseSpokenText("350 sapatênis masculino");
    expect(sale3.valorStr).toBe("350,00");
    expect(sale3.paresStr).toBe("1");
    expect(sale3.categoria).toBe("Masculino");
  });
});
