import { RouterProvider } from "react-router";
import { NotificationsProvider } from "./context/NotificationsContext";
import { router } from "./routes";

export default function App() {
  return (
    <NotificationsProvider>
      <RouterProvider router={router} />
    </NotificationsProvider>
  );
}

//   <Router>
//   <ScrollToTop />
//   <Routes>
//     {/* Dashboard Layout */}
//     <Route element={<AppLayout />}>
//       <Route index path="/" element={<Home />} />

//       {/* Documents */}
//       <Route path="/incoming-upload" element={<DocumentUploadPage />} />
//       <Route path="/incoming" element={<IncomingDocPage />} />
//       <Route path="/outgoing" element={<OutgoingDocPage />} />

//       {/* Others Page */}
//       <Route path="/profile" element={<UserProfiles />} />
//       <Route path="/calendar" element={<Calendar />} />

//       {/* Forms */}
//       <Route path="/form-elements" element={<FormElements />} />

//       {/* Tables */}
//       <Route path="/basic-tables" element={<BasicTables />} />

//       {/* Ui Elements */}
//       <Route path="/alerts" element={<Alerts />} />
//       <Route path="/avatars" element={<Avatars />} />
//       <Route path="/badge" element={<Badges />} />
//       <Route path="/buttons" element={<Buttons />} />
//       <Route path="/images" element={<Images />} />
//       <Route path="/videos" element={<Videos />} />

//       {/* Charts */}
//       <Route path="/line-chart" element={<LineChart />} />
//       <Route path="/bar-chart" element={<BarChart />} />
//     </Route>

//     {/* Auth Layout */}
//     <Route path="/signin" element={<SignIn />} />
//     <Route path="/signup" element={<SignUp />} />

//     {/* Fallback Route */}
//     <Route path="*" element={<NotFound />} />
//   </Routes>
// </Router>
