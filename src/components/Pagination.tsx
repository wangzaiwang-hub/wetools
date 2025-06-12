import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

interface PageButtonProps {
  page: number;
  isActive: boolean;
  onClick: () => void;
  disabled: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false
}) => {
  if (totalPages <= 1) return null;

  // 移除展开状态，只保留弹窗状态
  const [showLeftGoInput, setShowLeftGoInput] = useState(false);
  const [showRightGoInput, setShowRightGoInput] = useState(false);
  const [goToPage, setGoToPage] = useState<string>('');

  // 处理快速跳转
  const handleGoToPage = () => {
    const pageNumber = parseInt(goToPage);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber);
      resetAllState();
    }
  };

  // 重置所有状态
  const resetAllState = () => {
    setShowLeftGoInput(false);
    setShowRightGoInput(false);
    setGoToPage('');
  };

  // 渲染详细的页码
  const renderPageNumbers = () => {
    const pages = [];
    
    // 最大显示的页码数
    const maxVisiblePages = 7;
    // 当前页前后各显示多少页
    const siblingsCount = 2;
    
    // 计算起始和结束页
    let startPage = Math.max(1, currentPage - siblingsCount);
    let endPage = Math.min(totalPages, currentPage + siblingsCount);
    
    // 调整以确保我们最多显示 maxVisiblePages 个页码
    if (endPage - startPage + 1 > maxVisiblePages) {
      // 如果当前页靠近开始，则显示前面的页码
      if (currentPage - startPage < endPage - currentPage) {
        endPage = startPage + maxVisiblePages - 1;
      } else {
        // 如果当前页靠近结束，则显示后面的页码
        startPage = endPage - maxVisiblePages + 1;
      }
    }
    
    // 添加第一页
    if (startPage > 1) {
      pages.push(
        <PageButton 
          key={1} 
          page={1} 
          isActive={currentPage === 1}
          onClick={() => onPageChange(1)} 
          disabled={isLoading}
        />
      );
      
      // 如果不直接连接到第一页，添加省略号或输入框
      if (startPage > 2) {
        if (showLeftGoInput) {
          // 显示左侧快速跳转输入框
          pages.push(
            <div key="left-go" className="flex items-center bg-white rounded-full shadow-sm overflow-hidden border border-gray-200">
              <span className="px-2 text-gray-600 bg-white">Go</span>
              <input
                type="text"
                value={goToPage}
                onChange={(e) => setGoToPage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
                className="w-12 h-10 text-center border-none focus:outline-none focus:ring-0 bg-white"
                placeholder="页码"
                autoFocus
              />
              <button
                onClick={handleGoToPage}
                className="px-3 h-10 bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors border-l border-gray-200"
              >
                确定
              </button>
            </div>
          );
        } else {
          // 显示可点击的省略号，点击直接显示输入框
          pages.push(
            <button 
              key="left-ellipsis" 
              className="flex items-center justify-center w-10 h-10 rounded-full text-gray-500 hover:bg-gray-100"
              onClick={() => {
                setShowRightGoInput(false); // 关闭右侧输入框
                setShowLeftGoInput(true);
              }}
              title="点击跳转到指定页"
            >
              ...
            </button>
          );
        }
      }
    }
    
    // 添加中间的页码
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PageButton 
          key={i} 
          page={i} 
          isActive={currentPage === i}
          onClick={() => onPageChange(i)} 
          disabled={isLoading}
        />
      );
    }
    
    // 添加最后一页
    if (endPage < totalPages) {
      // 如果不直接连接到最后一页，添加省略号或输入框
      if (endPage < totalPages - 1) {
        if (showRightGoInput) {
          // 显示右侧快速跳转输入框
          pages.push(
            <div key="right-go" className="flex items-center bg-white rounded-full shadow-sm overflow-hidden border border-gray-200">
              <span className="px-2 text-gray-600 bg-white">Go</span>
              <input
                type="text"
                value={goToPage}
                onChange={(e) => setGoToPage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
                className="w-12 h-10 text-center border-none focus:outline-none focus:ring-0 bg-white"
                placeholder="页码"
                autoFocus
              />
              <button
                onClick={handleGoToPage}
                className="px-3 h-10 bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors border-l border-gray-200"
              >
                确定
              </button>
            </div>
          );
        } else {
          // 显示可点击的省略号，点击直接显示输入框
          pages.push(
            <button 
              key="right-ellipsis" 
              className="flex items-center justify-center w-10 h-10 rounded-full text-gray-500 hover:bg-gray-100"
              onClick={() => {
                setShowLeftGoInput(false); // 关闭左侧输入框
                setShowRightGoInput(true);
              }}
              title="点击跳转到指定页"
            >
              ...
            </button>
          );
        }
      }
      
      pages.push(
        <PageButton 
          key={totalPages} 
          page={totalPages} 
          isActive={currentPage === totalPages}
          onClick={() => onPageChange(totalPages)} 
          disabled={isLoading}
        />
      );
    }
    
    return pages;
  };

  // 页码按钮组件
  const PageButton: React.FC<PageButtonProps> = ({ page, isActive, onClick, disabled }) => (
    <button
      onClick={() => {
        resetAllState(); // 点击页码时重置所有状态
        onClick();
      }}
      disabled={disabled}
      className={clsx(
        "flex items-center justify-center w-10 h-10 rounded-full",
        "transition-all duration-300",
        isActive ? [
          "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
          "shadow-[0_2px_10px_-3px_rgba(59,130,246,0.3)]",
        ] : [
          "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-500",
          "shadow-sm hover:shadow"
        ],
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {page}
    </button>
  );

  return (
    <div className="flex justify-center items-center mt-8 space-x-2 flex-wrap">
      <button
        onClick={() => {
          resetAllState(); // 点击上一页时重置展开状态
          onPageChange(currentPage - 1);
        }}
        disabled={currentPage === 1 || isLoading}
        className={clsx(
          "flex items-center justify-center w-10 h-10 rounded-full",
          "transition-all duration-300",
          (currentPage === 1 || isLoading) ? [
            "bg-gray-100 text-gray-400 cursor-not-allowed"
          ] : [
            "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-500",
            "shadow-sm hover:shadow"
          ]
        )}
      >
        <ChevronLeft size={20} />
      </button>
      
      {renderPageNumbers()}
      
      <button
        onClick={() => {
          resetAllState(); // 点击下一页时重置展开状态
          onPageChange(currentPage + 1);
        }}
        disabled={currentPage === totalPages || isLoading}
        className={clsx(
          "flex items-center justify-center w-10 h-10 rounded-full",
          "transition-all duration-300",
          (currentPage === totalPages || isLoading) ? [
            "bg-gray-100 text-gray-400 cursor-not-allowed"
          ] : [
            "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-500",
            "shadow-sm hover:shadow"
          ]
        )}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default Pagination;