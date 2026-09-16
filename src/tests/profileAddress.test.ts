import { describe, it, expect } from "vitest";

describe("UsuarioAuth interface and profile restoration", () => {
  it("includes lojaEndereco and lojaCep in the profile structure", () => {
    const mockProfile = {
      uid: "user_test_123",
      email: "vendedora@seralle.com.br",
      displayName: "Maria Silva",
      loja: "Loja Cianorte",
      lojaEndereco: "Av. Souza Naves, 550, Cianorte - PR",
      lojaCep: "87200-252",
      cargo: "Vendedora de Calçados",
      telefone: "(44) 99999-8888",
      cadastroConfirmado: true,
    };

    expect(mockProfile.lojaEndereco).toBe("Av. Souza Naves, 550, Cianorte - PR");
    expect(mockProfile.lojaCep).toBe("87200-252");
    expect(mockProfile.cadastroConfirmado).toBe(true);
  });
});
