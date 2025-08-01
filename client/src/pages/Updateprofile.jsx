
import { useForm } from "react-hook-form"
import "../styles/updateprofile.css"
import { useState } from "react"
import { userauthstore } from "../Store/UserAuthStore"
import Loader from "../componenets/Loader"
import { useNavigate } from "react-router-dom"
import { IoArrowBackSharp } from "react-icons/io5";


const Updateprofile = () => {

    const { editprofile, isupdatinguser } = userauthstore()
    const [preview, setPreview] = useState()
    const { user, } = userauthstore()
    const navigate = useNavigate()


    const {
        register,
        setValue,

        handleSubmit,
    } = useForm({
        defaultValues: {
            name: user.name,
            username: user.username,
            bio: user.bio,
        }
    })


    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPreview(URL.createObjectURL(file))
        setValue('image', file)


    };


    function handleback() {
        navigate('/')
    }


    const onSubmit = async (data) => {
        const formdata = new FormData()
        formdata.append('name', data.name)
        formdata.append('username', data.username)
        formdata.append('bio', data.bio)
        formdata.append('image', data.image)

        editprofile(formdata)


    }


    return (
        <div className="updatebody">
            <div className="updatemainsec">
                <div className='updatesec'>

                    <div className="heading">
                        <div onClick={handleback} className="backicon"><IoArrowBackSharp scale={30} /></div>


                        <h1> Update profile</h1>
                    </div>
                    <div className='updateform'>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="textdata">
                                <label htmlFor="name">Name </label>
                                <input type="text" placeholder='Enter Your Name' {...register("name")} />


                                <label htmlFor="username">Username</label>
                                <input type="text" name='username' {...register("username")} />
                                <label htmlFor="bio">Bio</label>
                                <textarea name="bio" id="bio"{...register("bio")}></textarea>

                            </div>


                            <div className="profilepicsec">
                                <div className="imagepreview">
                                    <img src={preview || user.profileImg || "/avatar.jpg"} alt="" />
                                </div>
                                <label htmlFor="image">Profile Picture</label>
                                <input type="file" name='image' onChange={handleImageChange} />
                                <div className="savebtn">
                                    <button type='submit' disabled={isupdatinguser}>
                                        {isupdatinguser ? <Loader /> : "Save"}
                                    </button>
                                </div>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </div>



    )
}

export default Updateprofile
