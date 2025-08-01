import React from 'react'
import { useForm } from "react-hook-form"
import '../styles/signup.css'
import { FaUser } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { RiLockPasswordFill } from "react-icons/ri";
import { userauthstore } from '../Store/UserAuthStore';
import { useNavigate,Link } from 'react-router-dom';
import Loader from '../componenets/Loader';

const Signup = () => {

  const navigate = useNavigate()
  const { signup,isSigningup } = userauthstore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()


  const onsubmit = async (data) => {

    await signup(data, navigate)

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

            <button onClick={()=>{navigate('/login')}}>Sign In</button>
          </div>

          <div className="sec2">

            <form onSubmit={handleSubmit(onsubmit)}>
              <h2>Create Account</h2>
              <label htmlFor="name">
                <div><FaUser /></div>

                <input id='name' type="text" placeholder="Enter your name"{...register("name", { required: "Name is required" })} /> 
              </label>
              {errors.name && <p className="error-message">{errors.name.message}</p>}

              <label htmlFor="email">
                <div><MdEmail /></div>

                <input id='email' type="text" placeholder="Enter your Email"{...register("email",{
                                    required: "Email is required",
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: "Enter a valid email address"
                                    }
                                })} />
              </label>
              {errors.email && <p className="error-message">{errors.email.message}</p>}
              <label htmlFor="username">
                <div><MdEmail /></div>

                <input id='username' type="text" placeholder="Enter your username"{...register("username",{
                                    required: "Username is required"       
                                })} />
              </label>
              {errors.username && <p className="error-message">{errors.username.message}</p>}

              <label htmlFor="password">
                <div><RiLockPasswordFill />
                </div>

                <input id='password' type="password" placeholder="Enter your Password"{...register("password",{
                                    required: "Password is required",
                                    minLength: {
                                        value: 6,
                                        message: "Password must be at least 6 characters"
                                    }
                                })} />
              </label>
              {errors.password && <p className="error-message">{errors.password.message}</p>}



              <button type="submit" disabled={isSigningup}>
                {isSigningup ? <Loader/> : "Sign Up"}
              </button>
              <div className="signup-link-mobile">
                              <span>Don't have an account? </span>
                              <Link to="/login">Sign In</Link>
                              </div>
            </form>
          </div>

        </div>
      </div>


    </>
  )

}


export default Signup
