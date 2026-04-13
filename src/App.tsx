const AppRoutes = () => {
  const {
    isAuthenticated,
    isApproved,
    isLoading,
    role,
    profile,
    profileError,
  } = useAuth();

  const { salon } = useSalon();

  // 🔄 loading auth (APENAS AUTH pode travar)
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // 🔓 não logado
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/convite/:linkId" element={<ClientInvitePage />} />
        <Route path="/convite-equipe/:token" element={<TeamInvitePage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  // ❌ erro perfil
  if (profileError) {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <BlockedAccessPage
              title="Erro ao carregar perfil"
              description="Tente novamente."
            />
          }
        />
      </Routes>
    );
  }

  // ❌ REJEITADO
  if (profile?.status === "rejected") {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <BlockedAccessPage
              title="Acesso recusado"
              description="Seu cadastro não foi aprovado."
            />
          }
        />
      </Routes>
    );
  }

  // ⏳ pendente
  if (!isApproved && role !== "admin") {
    return (
      <Routes>
        <Route path="*" element={<PendingApprovalPage />} />
      </Routes>
    );
  }

  // 🏪 dono sem salão
  if (role === "dono" && !salon) {
    return (
      <Routes>
        <Route path="*" element={<CreateSalonPage />} />
      </Routes>
    );
  }

  // ✅ app normal
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/servicos" element={<ServicesPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/anamnese" element={<AnamnesesPage />} />
        <Route path="/pacotes" element={<PacotesPage />} />
        <Route path="/estoque" element={<EstoquePage />} />
        <Route path="/financeiro" element={<FinanceiroPage />} />
        <Route path="/contas" element={<ContasPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="/notificacoes" element={<NotificationsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route
          path="/minha-agenda"
          element={
            role === "cliente" ? <ClientSchedulePage /> : <MySchedulePage />
          }
        />
        <Route
          path="/servicos-catalogo"
          element={<ServicesShowcasePage />}
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
