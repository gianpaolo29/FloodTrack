import Swal from 'sweetalert2';

const theme = {
    background: '#ffffff',
    color: '#1a1a1a',
    confirmButtonColor: '#3b82f6',
    cancelButtonColor: '#6b7280',
};

const darkTheme = {
    background: '#171717',
    color: '#f5f5f5',
    confirmButtonColor: '#3b82f6',
    cancelButtonColor: '#525252',
};

function getTheme() {
    return document.documentElement.classList.contains('dark') ? darkTheme : theme;
}

export function swalSuccess(title: string, text?: string) {
    return Swal.fire({
        icon: 'success',
        title,
        text,
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
        ...getTheme(),
    });
}

export function swalError(title: string, text?: string) {
    return Swal.fire({
        icon: 'error',
        title,
        text,
        confirmButtonText: 'OK',
        ...getTheme(),
    });
}

export async function swalConfirm(
    title: string,
    text: string,
    confirmText = 'Yes, proceed',
    icon: 'warning' | 'question' = 'warning',
): Promise<boolean> {
    const result = await Swal.fire({
        icon,
        title,
        text,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        ...getTheme(),
    });
    return result.isConfirmed;
}

export async function swalDelete(itemName = 'this item'): Promise<boolean> {
    const result = await Swal.fire({
        icon: 'warning',
        title: 'Delete?',
        text: `Are you sure you want to delete ${itemName}? This cannot be undone.`,
        showCancelButton: true,
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        ...getTheme(),
        confirmButtonColor: '#ef4444',
    });
    return result.isConfirmed;
}
