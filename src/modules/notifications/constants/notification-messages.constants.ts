export const NOTIFICATION_MESSAGES = {
  // Sucesso
  CREATED: 'Notificação criada com sucesso',
  UPDATED: 'Notificação atualizada com sucesso',
  MARKED_AS_READ: 'Notificação marcada como lida',
  MARKED_AS_ARCHIVED: 'Notificação arquivada',
  RESPONDED: 'Resposta enviada com sucesso',
  ALL_MARKED_AS_READ: 'Todas as notificações marcadas como lidas',
  DELETED: 'Notificação excluída com sucesso',

  // Erros
  NOT_FOUND: 'Notificação não encontrada',
  NOT_AUTHORIZED: 'Você não tem permissão para executar esta ação',
  INVALID_STATUS_TRANSITION: 'Transição de status inválida',
  CONFIRMATION_EXPIRED: 'Prazo de confirmação expirado',
  ALREADY_RESPONDED: 'Notificação já respondida',
  
  // Validação
  TITLE_REQUIRED: 'Título é obrigatório',
  TITLE_TOO_LONG: 'Título não pode exceder 200 caracteres',
  MESSAGE_REQUIRED: 'Mensagem é obrigatória',
  MESSAGE_TOO_LONG: 'Mensagem não pode exceder 2000 caracteres',
  INVALID_CATEGORY: 'Categoria inválida',
  INVALID_URGENCY: 'Nível de urgência inválido',
  INVALID_ACTION: 'Ação inválida',
  TOO_MANY_ATTACHMENTS: 'Número máximo de anexos excedido',
  
  // WebSocket
  WS_CONNECTED: 'Conectado ao serviço de notificações',
  WS_DISCONNECTED: 'Desconectado do serviço de notificações',
  WS_ERROR: 'Erro na conexão WebSocket',
};

export const NOTIFICATION_EVENTS = {
  NEW_NOTIFICATION: 'new-notification',
  NOTIFICATION_READ: 'notification-read',
  NOTIFICATION_UPDATED: 'notification-updated',
  ALL_NOTIFICATIONS_READ: 'all-notifications-read',
  NOTIFICATION_DELETED: 'notification-deleted',
};