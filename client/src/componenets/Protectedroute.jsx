// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { userauthstore } from "../Store/UserAuthStore";
import { useEffect } from "react";
import Loader from './Loader';

const ProtectedRoute = ({ children }) => {
    const { ischeckingauth, checkauth } = userauthstore();

    useEffect(() => {

        checkauth(); // run on load
    }, []);

    if (ischeckingauth) {
        return <Loader />;
    }




    return children;
};

export default ProtectedRoute;
