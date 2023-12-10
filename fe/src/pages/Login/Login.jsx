import axios from "axios";
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import "./login.css";
import { Form } from "react-bootstrap";

const Login = () => {
  const [credentials, setCredentials] = useState({
    name: undefined,
    password: undefined,
  });

  const { loading, error, dispatch } = useContext(AuthContext);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleClick = async (e) => {
    e.preventDefault();
    dispatch({ type: "LOGIN_START" });
    try {
      const res = await axios.post(
        "https://qr-code-checkin.vercel.app/api/auth/manage-employee/login-employee",
        credentials,
        { withCredentials: true }
      );
      console.log(res);
      if (res?.data?.details?.name) {
        dispatch({ type: "LOGIN_SUCCESS", payload: res.data.details });
        navigate("/scan-qr");
      }
    } catch (err) {
      console.log(err);

      dispatch({ type: "LOGIN_FAILURE", payload: "errr" });
    }
  };

  return (
    <div className="login">
      <div className="lContainer">
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              onChange={handleChange}
              type="text"
              placeholder="Name"
              id="name"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              onChange={handleChange}
              type="password"
              placeholder="password"
              id="password"
            />
          </Form.Group>
        </Form>
        <button
          disabled={loading}
          onClick={handleClick}
          className="loginBtn btn"
        >
          Login
        </button>
        {error && <span>{error.message}</span>}
      </div>
    </div>
  );
};

export default Login;
