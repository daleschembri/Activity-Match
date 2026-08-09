import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ActivityLifecycleSync } from "./components/ActivityLifecycleSync";
import { BrowserNotificationBridge } from "./components/BrowserNotificationBridge";
import { AppShell } from "./components/AppShell";
import { AuthProvider } from "./lib/AuthProvider";
import { isSupabaseConfigured } from "./lib/supabase";
import { DiscoverPage } from "./routes/DiscoverPage";
import { FilterPage } from "./routes/FilterPage";
import { EndOfFeedPage } from "./routes/EndOfFeedPage";
import { ActivityDetailPage } from "./routes/ActivityDetailPage";
import { JoinRequestsPage } from "./routes/JoinRequestsPage";
import { WaitlistClaimPage } from "./routes/WaitlistClaimPage";
import { StarredActivitiesPage } from "./routes/StarredActivitiesPage";
import { CreateDescribePage } from "./routes/CreateDescribePage";
import { CreateReviewPage } from "./routes/CreateReviewPage";
import { InterestsOnboardingPage } from "./routes/InterestsOnboardingPage";
import { AvailabilityOnboardingPage } from "./routes/AvailabilityOnboardingPage";
import { MyPlansPage } from "./routes/MyPlansPage";
import { ActivityChatPage } from "./routes/ActivityChatPage";
import { ChatsPage } from "./routes/ChatsPage";
import { NotificationsPage } from "./routes/NotificationsPage";
import { FeedbackPage } from "./routes/FeedbackPage";
import { EditActivityPage } from "./routes/EditActivityPage";
import { ManageAttendeesPage } from "./routes/ManageAttendeesPage";
import { MarkAttendancePage } from "./routes/MarkAttendancePage";
import { AttendanceSavedPage } from "./routes/AttendanceSavedPage";
import { AttendanceOutcomePage } from "./routes/AttendanceOutcomePage";
import { PastActivityDetailPage } from "./routes/PastActivityDetailPage";
import { ProfilePage } from "./routes/ProfilePage";
import { EditProfilePage } from "./routes/EditProfilePage";
import { PublicActivityPage } from "./routes/PublicActivityPage";
import { GroupPage } from "./routes/GroupPage";
import { SplashPage } from "./routes/SplashPage";
import { WelcomePage } from "./routes/WelcomePage";
import { SignInOptionsPage } from "./routes/SignInOptionsPage";
import { PhoneAuthPage } from "./routes/PhoneAuthPage";
import { VerificationCodePage } from "./routes/VerificationCodePage";
import { AuthPage } from "./routes/AuthPage";

export function App() {
  const routes = (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/splash" element={<SplashPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/auth" element={<SignInOptionsPage />} />
        <Route path="/auth/phone" element={<PhoneAuthPage />} />
        <Route path="/auth/verify" element={<VerificationCodePage />} />
        <Route path="/auth/email" element={<AuthPage />} />
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/starred" element={<StarredActivitiesPage />} />
        <Route path="/filters" element={<FilterPage />} />
        <Route path="/feed/exhausted" element={<EndOfFeedPage />} />
        <Route path="/activities/:id" element={<ActivityDetailPage />} />
        <Route path="/activities/:id/chat" element={<ActivityChatPage />} />
        <Route path="/activities/:id/feedback" element={<FeedbackPage />} />
        <Route path="/activities/:id/edit" element={<EditActivityPage />} />
        <Route path="/activities/:id/attendees" element={<ManageAttendeesPage />} />
        <Route path="/activities/:id/attendance" element={<MarkAttendancePage />} />
        <Route path="/activities/:id/attendance/saved" element={<AttendanceSavedPage />} />
        <Route path="/activities/:id/attendance/outcome" element={<AttendanceOutcomePage />} />
        <Route path="/activities/:id/past" element={<PastActivityDetailPage />} />
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
      {isSupabaseConfigured ? (
        <AuthProvider>
          <ActivityLifecycleSync />
          <BrowserNotificationBridge />
          {routes}
        </AuthProvider>
      ) : (
        routes
      )}
    </BrowserRouter>
  );
}
