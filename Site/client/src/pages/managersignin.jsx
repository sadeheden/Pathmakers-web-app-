import React from "react";

function ManagerSignIn() {
  return (
    <div>
      <h2>Manager Sign-in</h2>
      <form>
        <input type="email" placeholder="Manager Email" required />
        <input type="password" placeholder="Password" required />
        <button type="submit">Sign In</button>
      </form>
    </div>
  );
}

export default ManagerSignIn;
