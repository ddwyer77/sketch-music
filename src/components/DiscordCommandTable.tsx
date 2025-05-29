import { ReactNode } from 'react';

type Command = {
  name: string;
  command: string;
  description?: string;
};

type DiscordCommandTableProps = {
  commands: Command[];
  children?: ReactNode;
};

export default function DiscordCommandTable({ commands, children }: DiscordCommandTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Command
              </th>
              {children}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {commands.map((cmd, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {cmd.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <code className="bg-gray-100 px-2 py-1 rounded">{cmd.command}</code>
                </td>
                {children}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 