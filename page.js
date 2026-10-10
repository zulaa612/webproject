const STUDENTS = {
  B240101: {
    name: "Бат-Эрдэнэ",
    hash: "703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b",
    program: "Программ хангамж",
    year: 2,
    grades: [
      ["Алгоритм ба өгөгдлийн бүтэц", 3, "A"],
      ["Вэб технологи", 3, "A-"],
      ["Дискрет математик", 2, "B+"],
      ["Англи хэл 2", 2, "A"],
    ],
    schedule: [
      ["Даваа 09:00", "Вэб технологи"],
      ["Мягмар 11:00", "Алгоритм ба өгөгдлийн бүтэц"],
      ["Лхагва 13:00", "Дискрет математик"],
      ["Пүрэв 09:00", "Англи хэл 2"],
    ],
  },
  B240102: {
    name: "Сүндэр",
    hash: "43c0cc244b63e196308eecd1024603bbaab47a509c6e87dae3f92134ddc53c5b",
    program: "Мэдээллийн систем",
    year: 2,
    grades: [
      ["Мэдээллийн сан", 3, "B+"],
      ["Статистик", 3, "B"],
      ["Вэб технологи", 3, "A"],
    ],
    schedule: [
      ["Даваа 11:00", "Мэдээллийн сан"],
      ["Лхагва 09:00", "Статистик"],
      ["Баасан 13:00", "Вэб технологи"],
    ],
  },
  B230087: {
    name: "Болормаа",
    hash: "c4a742537a132ef17b545f747a32802ca3aae213deca3f4d09cef98ea0d2267a", 
    program: "Компьютерын сүлжээ",
    year: 3,
    grades: [
      ["Сүлжээний аюулгүй байдал", 3, "A"],
      ["Үйлдлийн систем", 3, "A-"],
    ],
    schedule: [
      ["Мягмар 09:00", "Сүлжээний аюулгүй байдал"],
      ["Пүрэв 13:00", "Үйлдлийн систем"],
    ],
  },
};

const $ = (id) => document.getElementById(id);
const SESSION_KEY = "student-session";
const MAX_TRIES = 5;
const LOCK_MS = 30000;
let tries = 0;
let lockedUntil = 0;
let lockTimer = null;

async function sha256(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function save(id) {
  try {
    sessionStorage.setItem(SESSION_KEY, id);
  } catch (e) {
    window.__sid = id;
  }
}
function load() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch (e) {
    return window.__sid || null;
  }
}
function clear() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {}
  window.__sid = null;
}

function setMsg(text, type) {
  const m = $("msg");
  m.textContent = text;
  m.className = "msg " + (type || "");
}


function show(id) {
  const s = STUDENTS[id];
  if (!s) {
    clear();
    return;
  }

  $("login").classList.add("hidden");
  $("app").classList.remove("hidden");

  $("who").textContent = id + " · " + s.name;
  $("welcome").innerHTML = "Сайн байна уу, <span></span>";
  $("welcome").querySelector("span").textContent = s.name;
  $("meta").textContent = s.program + ", " + s.year + "-р курс";

  $("grades").innerHTML = "";
  s.grades.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((value, i) => {
      const td = document.createElement("td");
      td.textContent = value;
      if (i === 2) td.className = "grade";
      tr.appendChild(td);
    });
    $("grades").appendChild(tr);
  });

  $("schedule").innerHTML = "";
  s.schedule.forEach(([time, course]) => {
    const li = document.createElement("li");
    const t = document.createElement("time");
    t.textContent = time;
    const c = document.createElement("span");
    c.textContent = course;
    li.append(t, c);
    $("schedule").appendChild(li);
  });

  window.scrollTo(0, 0);
}


function lockUI() {
  clearInterval(lockTimer);
  const tick = () => {
    const left = Math.ceil((lockedUntil - Date.now()) / 1000);
    if (left <= 0) {
      clearInterval(lockTimer);
      tries = 0;
      $("submit").disabled = false;
      setMsg("");
    } else {
      $("submit").disabled = true;
      setMsg(
        "Хэт олон оролдлоо. " + left + " секундын дараа дахин оролдоно уу.",
        "err",
      );
    }
  };
  tick();
  lockTimer = setInterval(tick, 500);
}


async function login() {
  if (Date.now() < lockedUntil) return;

  const id = $("sid").value.trim().toUpperCase();
  const pw = $("pw").value;

  if (!id || !pw) {
    setMsg("Оюутны код болон нууц үгээ оруулна уу.", "err");
    return;
  }

  $("submit").disabled = true;
  let ok = false;

  try {
    const student = STUDENTS[id];
    const hash = await sha256(pw);
    ok = !!student && student.hash === hash;
  } catch (e) {
    setMsg(
      "Хөтөч нууцлал шалгах боломжгүй байна. HTTPS эсвэл localhost дээр нээнэ үү.",
      "err",
    );
    $("submit").disabled = false;
    return;
  }

  if (ok) {
    tries = 0;
    save(id);
    $("pw").value = "";
    setMsg("");
    $("submit").disabled = false;
    show(id);
  } else {
    tries++;
    $("pw").value = "";
    if (tries >= MAX_TRIES) {
      lockedUntil = Date.now() + LOCK_MS;
      lockUI();
    } else {
      setMsg(
        "Оюутны код эсвэл нууц үг буруу байна. (" +
          tries +
          "/" +
          MAX_TRIES +
          ")",
        "err",
      );
      $("submit").disabled = false;
    }
  }
}

$("submit").addEventListener("click", login);

[$("sid"), $("pw")].forEach((el) =>
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  }),
);

$("toggle").addEventListener("click", () => {
  const hidden = $("pw").type === "password";
  $("pw").type = hidden ? "text" : "password";
  $("toggle").textContent = hidden ? "Нуух" : "Харуулах";
});

$("logout").addEventListener("click", () => {
  clear();
  $("app").classList.add("hidden");
  $("login").classList.remove("hidden");
  $("sid").focus();
});

const existing = load();
if (existing) show(existing);
