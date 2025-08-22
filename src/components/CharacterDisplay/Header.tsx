import React from 'react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {title}
        </h1>
      </div>
    </header>
  );
};

export default Header;