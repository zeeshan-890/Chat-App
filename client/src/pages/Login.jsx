
import { useForm } from "react-hook-form"
import '../styles/signup.css'
import { FaUser } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { RiLockPasswordFill } from "react-icons/ri";
import { useNavigate, Link } from 'react-router-dom';
import { userauthstore } from "../Store/UserAuthStore";
import Loader from "../componenets/Loader";


const Login = () => {

    const { login,isloggingin } = userauthstore()
    const navigate = useNavigate()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm()


    const onSubmit = async (data) => {

        login(data, navigate)


    }


    return (
        <>

            <div className='signupbody'>

                <div className="mainsec">

                    <div className="sec1">

                        <div className="title">
                            WelCome Back
                        </div>


                        <div className='para'>
                            <p> Create your account to join our community. It only takes a minute — and it's free!</p>
                            <p>Log in to continue where you left off. We’re glad to see you again!</p>
                        </div>

                        <button onClick={()=>{navigate('/signup')}}>Sign Up</button>
                    </div>

                    <div className="sec2">

                        <form onSubmit={handleSubmit(onSubmit)}>
                            <h2>Login</h2>

                            <label htmlFor="email">
                                <div><MdEmail /></div>
                                <input id='email' type="text" placeholder="Enter your Email" {...register("email", {
                                    required: "Email is required",
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: "Enter a valid email address"
                                    }
                                })} />
                            </label>
                            {errors.email && <p className="error-message">{errors.email.message}</p>}

                            <label htmlFor="password">
                                <div><RiLockPasswordFill />
                                </div>
                                <input id='password' type="password" placeholder="Enter your Password" {...register("password", {
                                    required: "Password is required",
                                    minLength: {
                                        value: 6,
                                        message: "Password must be at least 6 characters"
                                    }
                                })} />
                            </label>
                            {errors.password && <p className="error-message">{errors.password.message}</p>}


                            <button type="submit" disabled={isloggingin}>{isloggingin? <Loader/> : "Sign In"}  </button>
                            <div className="signup-link-mobile">
                              <span>Don't have an account? </span>
                              <Link to="/signup">Sign Up</Link>
                            </div>
                        </form>
                    </div>
s
                </div>
            </div>


        </>
    )

}

export default Login
