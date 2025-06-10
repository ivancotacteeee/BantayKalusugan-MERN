import { RouterProvider, createBrowserRouter } from "react-router";
import RegisterPage from "@/pages/Register";

const Routes = () => {
    const routesForPublic = [
        { path: "/", element: <RegisterPage /> },
    ];

    const router = createBrowserRouter([
        ...routesForPublic,
    ]);

    return <RouterProvider router={router} />;
};

export default Routes;