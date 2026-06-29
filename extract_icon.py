import tkinter as tk
from tkinter import filedialog, messagebox
from tkinter import ttk
from PIL import Image, ImageTk
import os
import io


class IconExtractorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("EXE 图标提取器")
        self.root.geometry("600x500")
        self.root.resizable(True, True)
        
        # 存储当前提取的图标
        self.current_image = None
        self.current_icons = []
        self.current_icon_index = 0
        
        self.setup_ui()
    
    def setup_ui(self):
        # 主框架
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 配置网格权重
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        main_frame.rowconfigure(2, weight=1)
        
        # 文件选择部分
        file_frame = ttk.LabelFrame(main_frame, text="选择 EXE 文件", padding="10")
        file_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        file_frame.columnconfigure(0, weight=1)
        
        self.file_path_var = tk.StringVar()
        file_entry = ttk.Entry(file_frame, textvariable=self.file_path_var)
        file_entry.grid(row=0, column=0, sticky=(tk.W, tk.E), padx=(0, 10))
        
        browse_btn = ttk.Button(file_frame, text="浏览...", command=self.browse_file)
        browse_btn.grid(row=0, column=1)
        
        # 提取按钮
        extract_btn = ttk.Button(main_frame, text="提取图标", command=self.extract_icons)
        extract_btn.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # 图标预览区域
        preview_frame = ttk.LabelFrame(main_frame, text="图标预览", padding="10")
        preview_frame.grid(row=2, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        preview_frame.columnconfigure(0, weight=1)
        preview_frame.rowconfigure(0, weight=1)
        
        self.canvas = tk.Canvas(preview_frame, bg="white")
        self.canvas.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 图标导航
        nav_frame = ttk.Frame(preview_frame)
        nav_frame.grid(row=1, column=0, pady=(10, 0))
        
        self.prev_btn = ttk.Button(nav_frame, text="上一个", command=self.prev_icon, state=tk.DISABLED)
        self.prev_btn.grid(row=0, column=0, padx=(0, 10))
        
        self.icon_count_var = tk.StringVar(value="图标: 0 / 0")
        icon_count_label = ttk.Label(nav_frame, textvariable=self.icon_count_var)
        icon_count_label.grid(row=0, column=1, padx=10)
        
        self.next_btn = ttk.Button(nav_frame, text="下一个", command=self.next_icon, state=tk.DISABLED)
        self.next_btn.grid(row=0, column=2, padx=(10, 0))
        
        # 保存按钮
        save_frame = ttk.Frame(main_frame)
        save_frame.grid(row=3, column=0, pady=(10, 0))
        
        save_btn = ttk.Button(save_frame, text="保存当前图标", command=self.save_icon, state=tk.DISABLED)
        save_btn.grid(row=0, column=0, padx=(0, 10))
        
        save_all_btn = ttk.Button(save_frame, text="保存所有图标", command=self.save_all_icons, state=tk.DISABLED)
        save_all_btn.grid(row=0, column=1)
        
        self.save_btn = save_btn
        self.save_all_btn = save_all_btn
    
    def browse_file(self):
        file_path = filedialog.askopenfilename(
            title="选择 EXE 文件",
            filetypes=[("EXE 文件", "*.exe"), ("所有文件", "*.*")]
        )
        if file_path:
            self.file_path_var.set(file_path)
    
    def extract_icons(self):
        file_path = self.file_path_var.get()
        if not file_path or not os.path.exists(file_path):
            messagebox.showerror("错误", "请选择一个有效的 EXE 文件！")
            return
        
        try:
            # 尝试使用不同的方法提取图标
            self.current_icons = self._extract_icons_from_exe(file_path)
            
            if not self.current_icons:
                messagebox.showwarning("警告", "未找到图标！")
                return
            
            self.current_icon_index = 0
            self.update_icon_display()
            self.update_nav_buttons()
            
            self.save_btn.config(state=tk.NORMAL)
            self.save_all_btn.config(state=tk.NORMAL)
            
            messagebox.showinfo("成功", f"成功提取了 {len(self.current_icons)} 个图标！")
        except Exception as e:
            messagebox.showerror("错误", f"提取图标失败：{str(e)}")
    
    def _extract_icons_from_exe(self, exe_path):
        icons = []
        
        # 方法 1: 使用 pefile 库
        try:
            import pefile
            icons.extend(self._extract_with_pefile(exe_path))
        except ImportError:
            pass
        except Exception:
            pass
        
        # 方法 2: 使用 PIL 直接打开（有些 exe 可以这样）
        try:
            img = Image.open(exe_path)
            icons.append(img.copy())
        except Exception:
            pass
        
        # 方法 3: 使用 icoextract 库（如果可用）
        try:
            from icoextract import IconExtractor
            extractor = IconExtractor(exe_path)
            for i in range(extractor.icon_count):
                data = extractor.get_icon(i)
                img = Image.open(io.BytesIO(data))
                icons.append(img)
        except ImportError:
            pass
        except Exception:
            pass
        
        # 如果上面的方法都失败，尝试使用 pywin32（Windows 专用）
        if not icons:
            try:
                import win32ui
                import win32gui
                import win32api
                import win32con
                from PIL import ImageWin
                
                large, small = win32gui.ExtractIconEx(exe_path, 0)
                if large:
                    for hicon in large:
                        hdc = win32ui.CreateDCFromHandle(win32gui.GetDC(0))
                        hbmp = win32ui.CreateBitmap()
                        hbmp.CreateCompatibleBitmap(hdc, 32, 32)
                        hdc = hdc.CreateCompatibleDC()
                        hdc.SelectObject(hbmp)
                        hdc.DrawIcon((0, 0), hicon)
                        
                        bmpinfo = hbmp.GetInfo()
                        bmpstr = hbmp.GetBitmapBits(True)
                        img = Image.frombuffer(
                            'RGB',
                            (bmpinfo['bmWidth'], bmpinfo['bmHeight']),
                            bmpstr, 'raw', 'BGRX', 0, 1
                        )
                        icons.append(img)
                        
                        win32gui.DestroyIcon(hicon)
            except ImportError:
                pass
            except Exception:
                pass
        
        return icons
    
    def _extract_with_pefile(self, exe_path):
        icons = []
        try:
            pe = pefile.PE(exe_path)
            
            # 查找资源目录
            if hasattr(pe, 'DIRECTORY_ENTRY_RESOURCE'):
                for resource_type in pe.DIRECTORY_ENTRY_RESOURCE.entries:
                    if resource_type.id == pefile.RESOURCE_TYPE['RT_ICON'] or resource_type.id == pefile.RESOURCE_TYPE['RT_GROUP_ICON']:
                        if hasattr(resource_type, 'directory'):
                            for resource_id in resource_type.directory.entries:
                                if hasattr(resource_id, 'directory'):
                                    for resource_lang in resource_id.directory.entries:
                                        data = pe.get_data(resource_lang.data.struct.OffsetToData, resource_lang.data.struct.Size)
                                        try:
                                            img = Image.open(io.BytesIO(data))
                                            icons.append(img)
                                        except Exception:
                                            pass
            pe.close()
        except Exception:
            pass
        
        return icons
    
    def update_icon_display(self):
        if not self.current_icons:
            return
        
        img = self.current_icons[self.current_icon_index]
        
        # 调整图片大小以适应画布
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        
        if canvas_width < 10 or canvas_height < 10:
            canvas_width = 400
            canvas_height = 300
        
        # 保持宽高比
        img_ratio = img.width / img.height
        canvas_ratio = canvas_width / canvas_height
        
        if img_ratio > canvas_ratio:
            new_width = canvas_width - 40
            new_height = int(new_width / img_ratio)
        else:
            new_height = canvas_height - 40
            new_width = int(new_height * img_ratio)
        
        if new_width < 10:
            new_width = 10
        if new_height < 10:
            new_height = 10
        
        resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        self.current_image = ImageTk.PhotoImage(resized_img)
        
        self.canvas.delete("all")
        self.canvas.create_image(
            canvas_width // 2,
            canvas_height // 2,
            anchor=tk.CENTER,
            image=self.current_image
        )
        
        self.icon_count_var.set(f"图标: {self.current_icon_index + 1} / {len(self.current_icons)}")
    
    def update_nav_buttons(self):
        if not self.current_icons:
            self.prev_btn.config(state=tk.DISABLED)
            self.next_btn.config(state=tk.DISABLED)
        else:
            self.prev_btn.config(state=tk.NORMAL if self.current_icon_index > 0 else tk.DISABLED)
            self.next_btn.config(state=tk.NORMAL if self.current_icon_index < len(self.current_icons) - 1 else tk.DISABLED)
    
    def prev_icon(self):
        if self.current_icon_index > 0:
            self.current_icon_index -= 1
            self.update_icon_display()
            self.update_nav_buttons()
    
    def next_icon(self):
        if self.current_icon_index < len(self.current_icons) - 1:
            self.current_icon_index += 1
            self.update_icon_display()
            self.update_nav_buttons()
    
    def save_icon(self):
        if not self.current_icons:
            return
        
        img = self.current_icons[self.current_icon_index]
        
        file_path = filedialog.asksaveasfilename(
            title="保存图标",
            defaultextension=".png",
            filetypes=[
                ("PNG 文件", "*.png"),
                ("ICO 文件", "*.ico"),
                ("JPEG 文件", "*.jpg"),
                ("所有文件", "*.*")
            ]
        )
        
        if file_path:
            try:
                # 如果是保存为 ico，确保尺寸合适
                if file_path.lower().endswith('.ico'):
                    # 创建不同尺寸的图标
                    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
                    img.save(file_path, format='ICO', sizes=sizes)
                else:
                    img.save(file_path)
                messagebox.showinfo("成功", "图标保存成功！")
            except Exception as e:
                messagebox.showerror("错误", f"保存失败：{str(e)}")
    
    def save_all_icons(self):
        if not self.current_icons:
            return
        
        folder_path = filedialog.askdirectory(title="选择保存所有图标的文件夹")
        
        if folder_path:
            try:
                base_name = os.path.splitext(os.path.basename(self.file_path_var.get()))[0]
                
                for i, img in enumerate(self.current_icons):
                    file_name = f"{base_name}_icon_{i + 1}.png"
                    file_path = os.path.join(folder_path, file_name)
                    
                    # 检查文件是否存在，如果存在则添加数字
                    counter = 1
                    while os.path.exists(file_path):
                        file_name = f"{base_name}_icon_{i + 1}_{counter}.png"
                        file_path = os.path.join(folder_path, file_name)
                        counter += 1
                    
                    img.save(file_path)
                
                messagebox.showinfo("成功", f"成功保存了 {len(self.current_icons)} 个图标！")
            except Exception as e:
                messagebox.showerror("错误", f"保存失败：{str(e)}")


def main():
    root = tk.Tk()
    app = IconExtractorApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()

