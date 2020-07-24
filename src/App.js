import React from 'react';

function formatName(user) {
  return user.firstName + ' ' + user.message;
}

function getGreeting(user) {
  if (user) {
    return <h1>Hello, {formatName(user)}!</h1>;
  }
  return <h1>Hello, Stranger</h1>
}

function App() {
  const user = {
    firstName: "wyl",
    message: "(帅气的boy)"
  }
  const element = <h1>{getGreeting(user)}</h1>;
  return (
    <div>
      {element}
      {/* {this.props.children} */}
    </div>
  );
}



export default App;
