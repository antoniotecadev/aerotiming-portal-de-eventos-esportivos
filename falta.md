O painel de gestão grava agora na base de dados real, e já nenhuma parte do site usa os dados de demonstração. A Fase 9 está quase concluída.

O que mudou: não reescrevi as páginas do painel, por isso o visual e o funcionamento ficaram iguais. Mudei só o que está por baixo:

Os dados vêm da base de dados, já filtrados: o organizador só recebe os seus eventos, inscrições e resultados; utilizadores, banners, patrocinadores e definições só chegam ao admin.
Cada alteração passa por uma única entrada no servidor, que verifica a permissão e regista quem fez o quê.
Eventos: criar, editar e cancelar. O organizador cria em rascunho e o admin publica. Um evento com inscrições não é apagado, fica marcado como cancelado.
Inscrições: dorsal, kit e cancelar/reactivar. O "Confirmar pagamento" desta página também é real agora e atribui o dorsal.
Resultados: importar, editar e publicar.
Utilizadores: criar, promover a organizador ou admin, desactivar e eliminar. Ao criar uma conta, aparece uma palavra-passe temporária para enviar à pessoa.
Banners, patrocinadores, categorias e definições gravam na base de dados.
Uploads de imagens e PDF: vão para o Supabase Storage (o bucket media é criado automaticamente) e passam a funcionar em qualquer dispositivo.
Botão "Repor dados de demonstração": retirado do painel. Os dados de demonstração vivem agora em prisma/seed-data/ e só o seed os usa.
Testes:

No browser: a lista do painel mostra os 12 eventos reais.
Editar o resumo de um evento faz a alteração aparecer no site.
Um banner novo com imagem carregada para o Storage aparece na Home.
As páginas de utilizadores e de inscrições mostram dados reais, e o organizador consegue criar um evento.
O seed, o build e os 7 testes de inscrições continuam a passar.
No fim apaguei os dados de teste, incluindo a imagem no Storage.
O que falta na Fase 9:

9.8: o formulário de contacto ainda não grava as mensagens.
9.9: o rodapé e os contactos do site continuam escritos no código, embora as Definições já gravem os valores na base de dados.
9.7, adiada: as imagens antigas de public/images/ continuam a funcionar; só as novas vão para o Storage.
Precisa de saber:

Gravar um evento demora cerca de 4 segundos, porque grava distâncias, preços e percursos de uma vez. O painel volta logo à lista e a alteração aparece no site uns segundos depois.
O GUIA_MIGRACAO.md está actualizado: Fase 9 🟡 e tarefa 5.12 ✅. Quer que feche já a 9.8 e a 9.9, ou passamos para a Fase 10 (resultados)? A Fase 10 está quase toda adiantada pelo trabalho desta fase.