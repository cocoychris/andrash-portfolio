function Message() {
  const messageNum: Number = 3;
  return (
    <>
      <div>Hello World</div>
      <details>
        <summary>You have {String(messageNum)} new messages!</summary>Here is
        the message!
      </details>
    </>
  );
}

export default Message;
