const Dashboard = ({ children }: React.PropsWithChildren) => {
  return (
    <>
      <header>
        <h1>header component</h1>
      </header>

      <main>{children}</main>
      <footer>dashboard footer</footer>
    </>
  );
};

export default Dashboard;
