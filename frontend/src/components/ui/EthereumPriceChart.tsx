import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Static Ethereum price data - 10 years (August 2015 - July 2025)
const ethereumPriceData = [
  { date: '2015-08-01', price: 0.75, event: 'August 2015 - Early days' },
  { date: '2015-12-01', price: 0.95, event: 'End of 2015' },
  { date: '2016-06-01', price: 12.50, event: 'DAO launch' },
  { date: '2016-12-01', price: 8.20, event: 'Post-DAO hack' },
  { date: '2017-06-01', price: 350.00, event: '2017 bull run starts' },
  { date: '2018-01-13', price: 1432.88, event: '2017 bull run peak' },
  { date: '2018-06-01', price: 450.00, event: '2018 decline' },
  { date: '2018-12-15', price: 83.00, event: '2018 bear market bottom' },
  { date: '2019-06-26', price: 320.00, event: '2019 recovery' },
  { date: '2019-12-01', price: 130.00, event: 'End of 2019' },
  { date: '2020-03-13', price: 90.00, event: 'COVID-19 crash' },
  { date: '2020-06-01', price: 240.00, event: 'Post-COVID recovery' },
  { date: '2020-12-16', price: 650.00, event: '2020 bull run' },
  { date: '2021-05-12', price: 4362.35, event: '2021 bull run peak' },
  { date: '2021-07-20', price: 1720.00, event: '2021 correction' },
  { date: '2021-11-10', price: 4868.00, event: 'All-time high' },
  { date: '2022-01-01', price: 3680.00, event: 'Start of 2022' },
  { date: '2022-06-18', price: 880.00, event: '2022 bear market' },
  { date: '2022-09-15', price: 1470.00, event: 'The Merge' },
  { date: '2022-11-21', price: 1100.00, event: 'FTX collapse' },
  { date: '2023-01-01', price: 1200.00, event: '2023 recovery start' },
  { date: '2023-03-10', price: 1450.00, event: 'Banking crisis' },
  { date: '2023-06-01', price: 1900.00, event: 'Mid-2023 rally' },
  { date: '2023-10-01', price: 1650.00, event: 'Pre-ETF anticipation' },
  { date: '2024-01-01', price: 2300.00, event: 'ETF approval anticipation' },
  { date: '2024-03-14', price: 3900.00, event: 'Post-ETF approval' },
  { date: '2024-06-01', price: 3800.00, event: 'Mid-2024' },
  { date: '2024-09-01', price: 3500.00, event: 'Late 2024' },
  { date: '2024-12-01', price: 4200.00, event: 'End of 2024' },
  { date: '2025-01-01', price: 4500.00, event: 'Start of 2025' },
  { date: '2025-03-01', price: 5200.00, event: 'Early 2025 rally' },
  { date: '2025-06-01', price: 5800.00, event: 'Mid-2025 projection' },
  { date: '2025-07-01', price: 6200.00, event: 'July 2025 projection' },
];

const EthereumPriceChart: React.FC = () => {
  const chartData = {
    labels: ethereumPriceData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
    }),
    datasets: [
      {
        label: 'Ethereum Price (USD)',
        data: ethereumPriceData.map(item => item.price),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.2,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: 'rgb(139, 92, 246)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        pointBackgroundColor: 'rgb(139, 92, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Ethereum Price — Last 10 Years',
        color: 'rgb(17, 24, 39)',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 1,
        callbacks: {
          title: function(context: any) {
            const index = context[0].dataIndex;
            const item = ethereumPriceData[index];
            return `${item.date} - ${item.event}`;
          },
          label: function(context: any) {
            return `Price: $${context.parsed.y.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: false,
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          maxTicksLimit: 12,
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
      y: {
        display: true,
        title: {
          display: false,
        },
        min: 0,
        max: 7000,
        ticks: {
          color: 'rgb(107, 114, 128)',
          stepSize: 1000,
          maxTicksLimit: 12,
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
      <div style={{ height: 600 }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default EthereumPriceChart; 