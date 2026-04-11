// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { userauthstore } from "../Store/UserAuthStore";
import { useEffect } from "react";
import Loader from './Loader';

const ProtectedRoute = ({ children }) => {
    const { ischeckingauth, hasCheckedAuth, checkauth } = userauthstore();

    useEffect(() => {
        if (!hasCheckedAuth) {
            checkauth();
        }
    }, [hasCheckedAuth, checkauth]);

    if (ischeckingauth || !hasCheckedAuth) {
        return <Loader />;
    }




    return children;
};

export default ProtectedRoute;
