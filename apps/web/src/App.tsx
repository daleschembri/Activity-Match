import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AuthProvider } from "./lib/AuthProvider";
import { isSupabaseConfigured } from "./lib/supabase";
import { DiscoverPage } from "./routes/DiscoverPage";
import { FilterPage } from "./routes/FilterPage";
import { EndOfFeedPage } from "./routes/EndOfFeedPage";
import { ActivityDetailPage } from "./routes/ActivityDetailPage";
import { JoinRequestsPage } from "./routes/JoinRequestsPage";
import { WaitlistClaimPage } from "./routes/WaitlistClaimPage";
import { CreateDescribePage } from "./routes/CreateDescribePage";
import { CreateReviewPage } from "./routes/CreateReviewPage";
import { InterestsOnboardingPage } from "./routes/InterestsOnboardingPage";
import { AvailabilityOnboardingPage } from "./routes/AvailabilityOnboardingPage";
import { MyPlansPage } from "./routes/MyPlansPage";
import { ActivityChatPage } from "./routes/ActivityChatPage";
import { ChatsPage } from "./routes/ChatsPage";
import { NotificationsPage } from "./routes/NotificationsPage";
import { FeedbackPage } from "./routes/FeedbackPage";
import { ProfilePage } from "./routes/ProfilePage";
import { EditProfilePage } from "./routes/EditProfilePage";
import { PublicActivityPage } from "./routes/PublicActivityPage";
import { GroupPage } from "./routes/GroupPage";
import { AuthPage } from "./routes/AuthPage";

export function App() {
  const routes = (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/filters" element={<FilterPage />} />
        <Route path="/feed/exhausted" element={<EndOfFeedPage />} />
        <Route path="/activities/:id" element={<ActivityDetailPage />} />
        <Route path="/activities/:id/chat" element={<ActivityChatPage />} />
        <Route path="/activities/:id/feedback" element={<FeedbackPage />} />
        <Route path="/host/requests" element={<JoinRequestsPage />} />
        <Route path="/waitlist/:requestId" element={<WaitlistClaimPage />} />
        <Route path="/create/describe" element={<CreateDescribePage />} />
        <Route path="/create/review" element={<CreateReviewPage />} />
        <Route path="/onboarding/interests" element={<InterestsOnboardingPage />} />
        <Route path="/onboarding/availability" element={<AvailabilityOnboardingPage />} />
        <Route path="/plans" element={<MyPlansPage />} />
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/a/:slug" element={<PublicActivityPage />} />
        <Route path="/groups/:id" element={<GroupPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );

  return (
    <BrowserRouter>
      {isSupabaseConfigured ? <AuthProvider>{routes}</AuthProvider> : routes}
    </BrowserRouter>
  );
}
