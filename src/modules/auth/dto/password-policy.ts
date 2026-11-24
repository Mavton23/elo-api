/**
 * Política de senha: mínimo 8 caracteres, com maiúscula, minúscula e número.
 * Qualquer símbolo é permitido (frases-senha longas são encorajadas).
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;
export const PASSWORD_MESSAGE =
  'A senha deve ter entre 8 e 128 caracteres, incluindo maiúscula, minúscula e número';
